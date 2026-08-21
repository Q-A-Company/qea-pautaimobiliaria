# Pauta de Corretores

Sistema web de controle de pauta/rodízio de corretores para imobiliária, com
tela administrativa (`/admin`), tela pública para TV (`/tv`) e sincronização
em tempo real entre dispositivos via Supabase.

- **Frontend:** React + Vite + Tailwind CSS
- **Dados/tempo real/autenticação:** Supabase (Postgres + Realtime + Auth)
- **Hospedagem sugerida:** Netlify

---

## 1. Estrutura do projeto

```
src/
  lib/
    supabaseClient.js   → cliente Supabase (usa variáveis de ambiente)
    queueLogic.js        → REGRAS PURAS de fila e bolas (sem I/O, testável)
    queueLogic.test.js   → testes automatizados da lógica (vitest)
    pautaService.js       → liga queueLogic.js ao banco (leituras/escritas/realtime)
  hooks/
    usePauta.js           → estado + realtime para Admin e TV
    useCallChime.js        → som de chamada (Web Audio API, sem arquivo externo)
  contexts/AuthContext.jsx → sessão do Supabase Auth
  components/              → tabela admin, formulário, badges, histórico, split-flap
  pages/
    Login.jsx
    Admin.jsx
    TV.jsx
supabase/schema.sql        → SQL completo (tabelas, RLS, realtime, seed)
```

A lógica de bolas/fila fica isolada em `src/lib/queueLogic.js`, sem
nenhuma dependência de Supabase ou React — por isso pode (e deve) ser
testada isoladamente. Rode:

```bash
npm test
```

Os testes reproduzem exatamente o "EXEMPLO COMPLETO" do briefing (Paulo →
João com 2 bolas → Kleber, etc.), além de casos de bolas no limite,
corretores indisponíveis e fila circular.

---

## 2. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor** → cole todo o conteúdo de `supabase/schema.sql` →
   **Run**. Isso cria:
   - tabela `corretores` (id, nome, posicao, bolas, disponivel, timestamps);
   - tabela `estado_pauta` (linha única com o corretor atual);
   - tabela `movimentos` (histórico técnico usado pelo botão VOLTAR, para
     desfazer exatamente as bolas consumidas no último avanço);
   - tabela `historico` (log legível exibido no admin);
   - políticas de **Row Level Security**: leitura pública (necessária para
     a tela `/tv`, que não exige login) e escrita somente para usuários
     autenticados;
   - habilitação do **Realtime** nas tabelas `corretores`, `estado_pauta`
     e `historico`;
   - um seed opcional com 4 corretores de exemplo (Paulo, João, Kleber,
     Marcos) — apague/edite pela tela `/admin` como preferir.
3. Vá em **Authentication → Users** → **Add user** → crie o(s) login(s) do
   administrador (e-mail + senha). Não é necessário nenhum cadastro
   público: só o time interno usa `/admin`.
4. Vá em **Project Settings → API** e copie:
   - `Project URL` → vai em `VITE_SUPABASE_URL`
   - `anon public key` → vai em `VITE_SUPABASE_ANON_KEY`
5. Vá em **Project Settings → API → Realtime** (ou **Database → Replication**)
   e confirme que as tabelas `corretores`, `estado_pauta` e `historico`
   estão marcadas para replicação — o script SQL já faz isso, mas vale
   conferir na interface.

---

## 3. Rodar localmente

```bash
npm install
cp .env.example .env
# edite .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

- `http://localhost:5173/login` → login do administrador
- `http://localhost:5173/admin` → painel de controle (exige login)
- `http://localhost:5173/tv` → tela pública para a TV (sem login)

Abra `/admin` em um dispositivo e `/tv` em outro (ex.: notebook + TV/smart
TV/Chromecast com navegador, ou um segundo monitor) — as mudanças feitas
no admin aparecem na TV automaticamente, sem recarregar a página.

---

## 4. Deploy na Netlify

1. Suba o projeto para um repositório Git (GitHub/GitLab/Bitbucket).
2. Na Netlify: **Add new site → Import an existing project** → selecione
   o repositório.
3. Build settings (o `netlify.toml` incluso já configura isso
   automaticamente, mas conferindo):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Em **Site settings → Environment variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. O `netlify.toml` já inclui o redirect de SPA (`/* → /index.html`)
   necessário para que `/admin` e `/tv` funcionem em reload direto.
6. Na TV/Chromecast/Smart TV, abra a URL pública `+ /tv` (ex.:
   `https://sua-imobiliaria.netlify.app/tv`).

---

## 4.1. Protegendo o acesso à tela da TV (opcional, sem login)

Por padrão, `/tv` pediria um código de 4 dígitos assim que a tabela
`tv_access` existir no banco (ela já vem criada pelo `schema.sql`, com o
código inicial `0000`). Isso funciona sem exigir login — a TV continua
sem usuário/senha, só pede o código uma vez.

Como usar:

1. Entre em `/admin` — logo abaixo da lista de corretores tem o card
   **"Código de acesso da TV"**, mostrando o código atual (`0000` por
   padrão na primeira vez).
2. Clique em **"Gerar novo código"** para sortear um novo código de 4
   dígitos (recomendado, já que `0000` é previsível), ou em
   **"Definir código específico"** para escolher um manualmente.
3. Na TV, acesse `/tv` — vai aparecer uma tela pedindo o código. Digite
   os 4 dígitos.
4. Isso só precisa ser feito **uma vez por dispositivo** — o navegador da
   TV lembra o acesso a partir daí, mesmo depois de desligar/religar.
   Gerar um código novo depois **não desconecta** dispositivos que já
   tinham sido liberados — serve só para liberar dispositivos novos com
   um código diferente do anterior.
5. Por segurança, o código real nunca é enviado para quem está tentando
   entrar: a verificação acontece inteiramente no banco (função SQL
   `verificar_codigo_tv`), que só responde certo/errado.

Dica: se quiser configurar a TV sem digitar nada nela (controle remoto
costuma ser chato pra digitar), você pode montar a URL
`https://seu-dominio.com/tv?codigo=1234` no seu celular/computador e
abrir essa URL completa uma vez no navegador da TV — o código já vem
preenchido automaticamente.

---

## 5. Como funciona a regra de bolas (resumo)

- Cada corretor tem 0, 1 ou 2 bolas.
- Ao clicar **PRÓXIMO**, o sistema percorre a fila circular a partir da
  posição seguinte à do corretor atual:
  - corretor **indisponível** → é ignorado, bolas não mudam;
  - corretor **disponível com bolas > 0** → perde exatamente 1 bola e é
    pulado;
  - corretor **disponível com 0 bolas** → recebe a vez.
- Isso pode levar a mais de uma volta completa na fila quando há
  corretores com 2 bolas — a lógica trata esse caso (ver
  `avancarFila` em `queueLogic.js`).
- **PULAR VEZ** usa a mesma busca, mas sem exigir que o corretor atual
  tenha sido alcançado por "passagem" — é uma ação manual do
  administrador.
- **VOLTAR** não tenta "adivinhar" a fila ao contrário: cada PRÓXIMO/PULAR
  grava um registro em `movimentos` com o corretor anterior e a lista
  exata de bolas consumidas naquele passo. VOLTAR lê o último movimento
  não desfeito, restaura o corretor anterior e devolve exatamente as
  bolas que haviam sido removidas — garantindo que a contagem nunca seja
  corrompida.
- Ajustes manuais (**+1 bola**, **+2 bolas**, **-1 bola**, **Limpar**)
  sempre respeitam o limite de 0 a 2.
- O botão **Limpar histórico**, na tela de administração, apaga
  permanentemente todos os registros da tabela `historico` (ação
  irreversível, com confirmação antes de executar).
- O som da TV já vem **ativado por padrão**. Como navegadores bloqueiam
  áudio antes de qualquer interação do usuário, a tela escuta
  silenciosamente o primeiro clique/toque/tecla na página para destravar
  o áudio — sem exigir um botão dedicado. O botão no canto superior
  direito da TV serve apenas para desligar/religar manualmente.

---

## 6. Checklist de testes (conforme especificação)

| Cenário | Onde verificar |
|---|---|
| Fila circular | `npm test` (`fila circular`) + testar clicando PRÓXIMO várias vezes no admin |
| Bolas (consumo 1 a 1) | `npm test` (`exemplo completo da especificação`) |
| Duas bolas no mesmo corretor | `npm test` (`corretor com 2 bolas é pulado duas vezes...`) |
| Corretores indisponíveis | `npm test` (`corretores indisponíveis`) + toggle no admin |
| Voltar | Clicar PRÓXIMO algumas vezes e depois VOLTAR no admin; conferir que as bolas voltam ao valor exato anterior |
| Pular | Botão PULAR VEZ no admin |
| Atualização em tempo real | Abrir `/admin` e `/tv` em abas/dispositivos diferentes lado a lado |
| Atualização da TV | Mesma verificação acima — a TV não deve precisar de reload |
| Som | Clicar "ATIVAR SOM" na TV uma vez, depois mudar o corretor da vez no admin |
| Persistência | Fechar e reabrir o navegador em `/admin` e em `/tv` — o estado deve continuar de onde parou (vem do banco, não do localStorage) |

---

## 7. Notas de segurança

- `/tv` é pública e **somente leitura** — as políticas RLS bloqueiam
  qualquer escrita de usuários anônimos nas tabelas `corretores`,
  `estado_pauta`, `movimentos` e `historico`.
- `/admin` exige sessão válida do Supabase Auth (`ProtectedRoute`
  redireciona para `/login` caso contrário).
- A chave usada no frontend é sempre a **anon public key** — nunca a
  `service_role key`, que não deve ser exposta no cliente.
