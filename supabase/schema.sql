-- =========================================================================
-- Pauta de Corretores — schema Supabase
-- Execute este script inteiro no SQL Editor do seu projeto Supabase.
-- =========================================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------------
-- Tabela: corretores
-- -------------------------------------------------------------------------
create table if not exists public.corretores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  posicao integer not null,
  bolas integer not null default 0 check (bolas >= 0 and bolas <= 2),
  disponivel boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posicao_unica unique (posicao)
);

create index if not exists idx_corretores_posicao on public.corretores (posicao);

-- -------------------------------------------------------------------------
-- Tabela: estado_pauta (linha única, guarda quem está na vez agora)
-- -------------------------------------------------------------------------
create table if not exists public.estado_pauta (
  id integer primary key default 1,
  corretor_atual_id uuid references public.corretores (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);

insert into public.estado_pauta (id, corretor_atual_id)
values (1, null)
on conflict (id) do nothing;

-- -------------------------------------------------------------------------
-- Tabela: tv_access (linha única, guarda o código de 4 dígitos da TV)
-- O valor do código NUNCA é exposto por leitura pública — apenas o
-- administrador autenticado consegue ler/alterar diretamente. A tela da
-- TV valida o código digitado através da função verificar_codigo_tv()
-- abaixo, que responde só "certo"/"errado", sem revelar o código real.
-- -------------------------------------------------------------------------
create table if not exists public.tv_access (
  id integer primary key default 1,
  codigo text not null default '0000',
  updated_at timestamptz not null default now(),
  constraint singleton_tv_access check (id = 1)
);

insert into public.tv_access (id, codigo)
values (1, '0000')
on conflict (id) do nothing;

-- -------------------------------------------------------------------------
-- Tabela: movimentos
-- Guarda cada avanço/pulo com os dados necessários para o "VOLTAR"
-- desfazer exatamente o que foi feito (sem corromper a contagem de bolas).
-- -------------------------------------------------------------------------
create table if not exists public.movimentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('proximo', 'pular', 'manual')),
  corretor_anterior_id uuid references public.corretores (id) on delete set null,
  corretor_novo_id uuid references public.corretores (id) on delete set null,
  bolas_consumidas jsonb not null default '[]'::jsonb, -- [{id, antes, depois}, ...]
  desfeito boolean not null default false,
  admin_email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_movimentos_created_at on public.movimentos (created_at desc);

-- -------------------------------------------------------------------------
-- Tabela: historico (log legível para exibição na tela de histórico)
-- -------------------------------------------------------------------------
create table if not exists public.historico (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid references public.corretores (id) on delete set null,
  corretor_nome text,
  acao text not null, -- ex: 'chamado', 'pulado', 'bola_removida', 'indisponivel', 'disponivel', 'voltar', 'bola_manual'
  descricao text not null,
  bolas_antes integer,
  bolas_depois integer,
  admin_email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_historico_created_at on public.historico (created_at desc);

-- -------------------------------------------------------------------------
-- Trigger: updated_at automático em corretores
-- -------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_corretores_updated_at on public.corretores;
create trigger trg_corretores_updated_at
  before update on public.corretores
  for each row execute function public.set_updated_at();

-- =========================================================================
-- ROW LEVEL SECURITY
-- Regra geral: qualquer pessoa (mesmo anônima) pode LER — necessário para
-- a tela pública /tv. Apenas usuários autenticados podem ESCREVER —
-- necessário para a área /admin.
-- =========================================================================

alter table public.corretores enable row level security;
alter table public.estado_pauta enable row level security;
alter table public.movimentos enable row level security;
alter table public.historico enable row level security;
alter table public.tv_access enable row level security;

-- corretores
drop policy if exists "corretores_select_publico" on public.corretores;
create policy "corretores_select_publico"
  on public.corretores for select
  to anon, authenticated
  using (true);

drop policy if exists "corretores_write_autenticado" on public.corretores;
create policy "corretores_write_autenticado"
  on public.corretores for all
  to authenticated
  using (true)
  with check (true);

-- estado_pauta
drop policy if exists "estado_pauta_select_publico" on public.estado_pauta;
create policy "estado_pauta_select_publico"
  on public.estado_pauta for select
  to anon, authenticated
  using (true);

drop policy if exists "estado_pauta_write_autenticado" on public.estado_pauta;
create policy "estado_pauta_write_autenticado"
  on public.estado_pauta for all
  to authenticated
  using (true)
  with check (true);

-- movimentos (não precisa ser público; só o admin usa para o "voltar")
drop policy if exists "movimentos_all_autenticado" on public.movimentos;
create policy "movimentos_all_autenticado"
  on public.movimentos for all
  to authenticated
  using (true)
  with check (true);

-- historico (leitura pode ficar liberada para autenticados; escrita idem)
drop policy if exists "historico_all_autenticado" on public.historico;
create policy "historico_all_autenticado"
  on public.historico for all
  to authenticated
  using (true)
  with check (true);

-- tv_access: SEM policy de leitura pública de propósito — nem "anon" nem
-- sequer "authenticated" por padrão teria SELECT liberado sem uma policy
-- explícita. Só o administrador autenticado consegue ler/alterar o
-- código diretamente (para mostrá-lo e regenerá-lo no painel /admin).
-- A tela pública da TV nunca lê essa tabela diretamente — ela só chama a
-- função verificar_codigo_tv() abaixo, que responde apenas true/false.
drop policy if exists "tv_access_admin" on public.tv_access;
create policy "tv_access_admin"
  on public.tv_access for all
  to authenticated
  using (true)
  with check (true);

-- Função que valida um código digitado sem expor o código real via
-- SELECT. security definer = roda com privilégio elevado (ignora a RLS
-- acima só dentro desta função), então mesmo usuários anônimos podem
-- executá-la — mas só recebem um true/false, nunca o código em si.
create or replace function public.verificar_codigo_tv(p_codigo text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tv_access where id = 1 and codigo = p_codigo
  );
$$;

revoke all on function public.verificar_codigo_tv(text) from public;
grant execute on function public.verificar_codigo_tv(text) to anon, authenticated;

-- =========================================================================
-- REALTIME
-- Garante que as tabelas emitam eventos via Supabase Realtime.
-- Usa blocos DO...IF NOT EXISTS para que o script possa ser executado
-- várias vezes sem erro (ALTER PUBLICATION ... ADD TABLE não aceita
-- "IF NOT EXISTS" nativamente).
-- =========================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'corretores'
  ) then
    alter publication supabase_realtime add table public.corretores;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'estado_pauta'
  ) then
    alter publication supabase_realtime add table public.estado_pauta;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'historico'
  ) then
    alter publication supabase_realtime add table public.historico;
  end if;
end $$;

-- =========================================================================
-- SEED opcional: corretores de exemplo (apague/ajuste como quiser)
-- =========================================================================
insert into public.corretores (nome, posicao, bolas, disponivel)
values
  ('Paulo', 1, 0, true),
  ('João', 2, 0, true),
  ('Kleber', 3, 0, true),
  ('Marcos', 4, 0, true)
on conflict (posicao) do nothing;
