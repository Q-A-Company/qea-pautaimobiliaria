import { supabase } from './supabaseClient'
import { avancarFila, pularVez, ajustarBolasManual, clampBolas } from './queueLogic'

// ---------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------

export async function fetchCorretores() {
  const { data, error } = await supabase
    .from('corretores')
    .select('*')
    .order('posicao', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchEstado() {
  const { data, error } = await supabase
    .from('estado_pauta')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchHistorico(limit = 100) {
  const { data, error } = await supabase
    .from('historico')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

/**
 * Apaga todo o histórico exibido no admin. Ação irreversível — a
 * confirmação deve acontecer na UI antes de chamar esta função.
 */
export async function limparHistorico() {
  // "neq" com um uuid impossível funciona como "delete all rows" respeitando RLS.
  const { error } = await supabase.from('historico').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
}

// ---------------------------------------------------------------------
// Escrita: núcleo da lógica de fila (usa queueLogic.js e persiste)
// ---------------------------------------------------------------------

async function currentAdminEmail() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.email ?? null
}

async function aplicarConsumo(consumidos) {
  // Atualiza no banco cada corretor que teve bola removida durante a passagem.
  for (const c of consumidos) {
    const { error } = await supabase.from('corretores').update({ bolas: c.depois }).eq('id', c.id)
    if (error) throw error
  }
}

async function registrarMovimento({ tipo, corretorAnteriorId, corretorNovoId, consumidos, adminEmail }) {
  const { data, error } = await supabase
    .from('movimentos')
    .insert({
      tipo,
      corretor_anterior_id: corretorAnteriorId,
      corretor_novo_id: corretorNovoId,
      bolas_consumidas: consumidos,
      admin_email: adminEmail,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

async function registrarHistorico(entradas) {
  const lista = Array.isArray(entradas) ? entradas : [entradas]
  const { error } = await supabase.from('historico').insert(lista)
  if (error) throw error
}

async function atualizarEstado(corretorAtualId) {
  const { error } = await supabase
    .from('estado_pauta')
    .upsert({ id: 1, corretor_atual_id: corretorAtualId, updated_at: new Date().toISOString() })
  if (error) throw error
}

function nomePorId(corretores, id) {
  return corretores.find((c) => c.id === id)?.nome ?? '—'
}

/**
 * Botão PRÓXIMO: avança a fila aplicando toda a regra de bolas.
 */
export async function irParaProximo() {
  const [corretores, estado] = await Promise.all([fetchCorretores(), fetchEstado()])
  const currentId = estado?.corretor_atual_id ?? null
  const { nextId, consumidos } = avancarFila(corretores, currentId)
  const adminEmail = await currentAdminEmail()

  await aplicarConsumo(consumidos)
  await atualizarEstado(nextId)
  await registrarMovimento({
    tipo: 'proximo',
    corretorAnteriorId: currentId,
    corretorNovoId: nextId,
    consumidos,
    adminEmail,
  })

  const historicoEntradas = consumidos.map((c) => ({
    corretor_id: c.id,
    corretor_nome: nomePorId(corretores, c.id),
    acao: 'bola_removida',
    descricao: `${nomePorId(corretores, c.id)} pulado — 1 bola removida`,
    bolas_antes: c.antes,
    bolas_depois: c.depois,
    admin_email: adminEmail,
  }))
  if (nextId) {
    historicoEntradas.push({
      corretor_id: nextId,
      corretor_nome: nomePorId(corretores, nextId),
      acao: 'chamado',
      descricao: `${nomePorId(corretores, nextId)} chamado`,
      admin_email: adminEmail,
    })
  }
  if (historicoEntradas.length) await registrarHistorico(historicoEntradas)

  return nextId
}

/**
 * Botão PULAR VEZ: pula manualmente o atual, sem penalizá-lo, e avança
 * usando a mesma busca de elegibilidade.
 */
export async function pularVezAtual() {
  const [corretores, estado] = await Promise.all([fetchCorretores(), fetchEstado()])
  const currentId = estado?.corretor_atual_id ?? null
  const { nextId, consumidos } = pularVez(corretores, currentId)
  const adminEmail = await currentAdminEmail()

  await aplicarConsumo(consumidos)
  await atualizarEstado(nextId)
  await registrarMovimento({
    tipo: 'pular',
    corretorAnteriorId: currentId,
    corretorNovoId: nextId,
    consumidos,
    adminEmail,
  })

  const historicoEntradas = consumidos.map((c) => ({
    corretor_id: c.id,
    corretor_nome: nomePorId(corretores, c.id),
    acao: 'bola_removida',
    descricao: `${nomePorId(corretores, c.id)} pulado — 1 bola removida`,
    bolas_antes: c.antes,
    bolas_depois: c.depois,
    admin_email: adminEmail,
  }))
  historicoEntradas.push({
    corretor_id: currentId,
    corretor_nome: currentId ? nomePorId(corretores, currentId) : null,
    acao: 'pulado_manual',
    descricao: `${currentId ? nomePorId(corretores, currentId) : 'Vaga'} pulado manualmente pelo administrador`,
    admin_email: adminEmail,
  })
  if (nextId) {
    historicoEntradas.push({
      corretor_id: nextId,
      corretor_nome: nomePorId(corretores, nextId),
      acao: 'chamado',
      descricao: `${nomePorId(corretores, nextId)} chamado`,
      admin_email: adminEmail,
    })
  }
  await registrarHistorico(historicoEntradas)

  return nextId
}

/**
 * Botão VOLTAR: desfaz o último movimento (proximo/pular) não desfeito,
 * restaurando exatamente o corretor anterior e as bolas consumidas
 * naquele passo — nunca corrompendo a contagem de bolas.
 */
export async function voltarUltimoMovimento() {
  const { data: ultimos, error } = await supabase
    .from('movimentos')
    .select('*')
    .eq('desfeito', false)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  const movimento = ultimos?.[0]
  if (!movimento) {
    return { ok: false, motivo: 'Não há movimentos para desfazer.' }
  }

  const corretores = await fetchCorretores()
  const adminEmail = await currentAdminEmail()

  // Restaura as bolas que foram consumidas naquele avanço.
  const consumidos = movimento.bolas_consumidas || []
  for (const c of consumidos) {
    const { error: updErr } = await supabase.from('corretores').update({ bolas: c.antes }).eq('id', c.id)
    if (updErr) throw updErr
  }

  await atualizarEstado(movimento.corretor_anterior_id)

  const { error: markErr } = await supabase
    .from('movimentos')
    .update({ desfeito: true })
    .eq('id', movimento.id)
  if (markErr) throw markErr

  const historicoEntradas = consumidos.map((c) => ({
    corretor_id: c.id,
    corretor_nome: nomePorId(corretores, c.id),
    acao: 'bola_restaurada',
    descricao: `${nomePorId(corretores, c.id)} — bola restaurada (voltar)`,
    bolas_antes: c.depois,
    bolas_depois: c.antes,
    admin_email: adminEmail,
  }))
  historicoEntradas.push({
    corretor_id: movimento.corretor_anterior_id,
    corretor_nome: movimento.corretor_anterior_id ? nomePorId(corretores, movimento.corretor_anterior_id) : null,
    acao: 'voltar',
    descricao: `Administrador voltou para ${
      movimento.corretor_anterior_id ? nomePorId(corretores, movimento.corretor_anterior_id) : 'nenhum corretor'
    }`,
    admin_email: adminEmail,
  })
  await registrarHistorico(historicoEntradas)

  return { ok: true, corretorAtualId: movimento.corretor_anterior_id }
}

// ---------------------------------------------------------------------
// Ajustes manuais de bolas
// ---------------------------------------------------------------------

export async function ajustarBolas(corretor, acao) {
  const novaQuantidade = ajustarBolasManual(corretor.bolas, acao)
  const adminEmail = await currentAdminEmail()
  const { error } = await supabase.from('corretores').update({ bolas: novaQuantidade }).eq('id', corretor.id)
  if (error) throw error
  await registrarHistorico({
    corretor_id: corretor.id,
    corretor_nome: corretor.nome,
    acao: 'bola_manual',
    descricao: `${corretor.nome} — ajuste manual de bolas (${corretor.bolas} → ${novaQuantidade})`,
    bolas_antes: corretor.bolas,
    bolas_depois: novaQuantidade,
    admin_email: adminEmail,
  })
  return novaQuantidade
}

export async function definirDisponibilidade(corretor, disponivel) {
  const adminEmail = await currentAdminEmail()
  const { error } = await supabase.from('corretores').update({ disponivel }).eq('id', corretor.id)
  if (error) throw error
  await registrarHistorico({
    corretor_id: corretor.id,
    corretor_nome: corretor.nome,
    acao: disponivel ? 'disponivel' : 'indisponivel',
    descricao: `${corretor.nome} colocado como ${disponivel ? 'disponível' : 'indisponível'}`,
    admin_email: adminEmail,
  })
}

/**
 * Seleção manual: o administrador clica no nome de um corretor na tabela
 * e ele passa a ser o corretor da vez imediatamente — sem passar pela
 * lógica de bolas (não pula nem consome bola de ninguém no caminho).
 * Fica registrado como um movimento "manual", então o botão VOLTAR
 * também consegue desfazer essa ação normalmente.
 */
export async function selecionarCorretorManualmente(corretor) {
  if (!corretor.disponivel) {
    throw new Error(`${corretor.nome} está indisponível e não pode receber a vez.`)
  }
  const estado = await fetchEstado()
  const currentId = estado?.corretor_atual_id ?? null
  if (currentId === corretor.id) return // já está na vez, nada a fazer

  const adminEmail = await currentAdminEmail()

  await atualizarEstado(corretor.id)
  await registrarMovimento({
    tipo: 'manual',
    corretorAnteriorId: currentId,
    corretorNovoId: corretor.id,
    consumidos: [],
    adminEmail,
  })
  await registrarHistorico({
    corretor_id: corretor.id,
    corretor_nome: corretor.nome,
    acao: 'selecionado_manual',
    descricao: `${corretor.nome} selecionado manualmente pelo administrador`,
    admin_email: adminEmail,
  })
}

// ---------------------------------------------------------------------
// CRUD de corretores
// ---------------------------------------------------------------------

export async function adicionarCorretor({ nome, posicao }) {
  const adminEmail = await currentAdminEmail()
  const { data, error } = await supabase
    .from('corretores')
    .insert({ nome, posicao, bolas: 0, disponivel: true })
    .select()
    .single()
  if (error) throw error
  await registrarHistorico({
    corretor_id: data.id,
    corretor_nome: data.nome,
    acao: 'criado',
    descricao: `${data.nome} adicionado à fila (posição ${posicao})`,
    admin_email: adminEmail,
  })
  return data
}

export async function editarCorretor(id, campos) {
  const adminEmail = await currentAdminEmail()
  const payload = { ...campos }
  if ('bolas' in payload) payload.bolas = clampBolas(payload.bolas)
  const { data, error } = await supabase.from('corretores').update(payload).eq('id', id).select().single()
  if (error) throw error
  await registrarHistorico({
    corretor_id: id,
    corretor_nome: data.nome,
    acao: 'editado',
    descricao: `${data.nome} — dados atualizados`,
    admin_email: adminEmail,
  })
  return data
}

export async function removerCorretor(corretor) {
  const adminEmail = await currentAdminEmail()
  const { error } = await supabase.from('corretores').delete().eq('id', corretor.id)
  if (error) throw error
  await registrarHistorico({
    corretor_id: null,
    corretor_nome: corretor.nome,
    acao: 'removido',
    descricao: `${corretor.nome} removido da fila`,
    admin_email: adminEmail,
  })
}

// ---------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------

/**
 * Assina mudanças em corretores + estado_pauta e chama onChange() a cada
 * evento, para o chamador simplesmente re-buscar os dados atualizados.
 */
export function subscribeRealtime(onChange) {
  const channel = supabase
    .channel('pauta-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'corretores' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'estado_pauta' }, onChange)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeHistorico(onInsert) {
  const channel = supabase
    .channel('historico-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'historico' }, onInsert)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ---------------------------------------------------------------------
// Código de acesso da TV (proteção leve, sem login, para a rota /tv)
// ---------------------------------------------------------------------

/** Só o admin autenticado consegue ler o código real (RLS bloqueia anon). */
export async function buscarCodigoTv() {
  const { data, error } = await supabase.from('tv_access').select('codigo').eq('id', 1).maybeSingle()
  if (error) throw error
  return data?.codigo ?? null
}

/** Gera um novo código aleatório de 4 dígitos (0000–9999, com zeros à esquerda). */
export function gerarCodigoTvAleatorio() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

export async function definirCodigoTv(novoCodigo) {
  if (!/^\d{4}$/.test(novoCodigo)) {
    throw new Error('O código precisa ter exatamente 4 dígitos numéricos.')
  }
  const adminEmail = await currentAdminEmail()
  const { error } = await supabase
    .from('tv_access')
    .upsert({ id: 1, codigo: novoCodigo, updated_at: new Date().toISOString() })
  if (error) throw error
  await registrarHistorico({
    corretor_id: null,
    corretor_nome: null,
    acao: 'codigo_tv_alterado',
    descricao: 'Código de acesso da tela de TV foi alterado pelo administrador',
    admin_email: adminEmail,
  })
}

/**
 * Verifica um código digitado na tela da TV, sem nunca expor o código
 * real ao navegador — a resposta é só true/false, vinda de uma função
 * no banco (verificar_codigo_tv), chamável por usuários anônimos.
 */
export async function verificarCodigoTv(codigoTentativa) {
  const { data, error } = await supabase.rpc('verificar_codigo_tv', { p_codigo: codigoTentativa })
  if (error) throw error
  return data === true
}
