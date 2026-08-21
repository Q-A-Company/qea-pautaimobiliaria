// queueLogic.js
//
// Lógica pura (sem dependências externas) do rodízio de corretores.
// Mantida separada da camada de dados/UI de propósito, para poder ser
// testada isoladamente (ver queueLogic.test.js) e para garantir que a
// regra de bolas nunca seja "simplificada" por engano em outro lugar do app.

export const MAX_BOLAS = 2
export const MIN_BOLAS = 0

/** Garante que a quantidade de bolas fique sempre entre 0 e MAX_BOLAS. */
export function clampBolas(valor) {
  return Math.min(MAX_BOLAS, Math.max(MIN_BOLAS, valor))
}

/** Retorna uma cópia da lista ordenada pela posição (a posição nunca é alterada aqui). */
export function porPosicao(corretores) {
  return [...corretores].sort((a, b) => a.posicao - b.posicao)
}

/**
 * Avança a fila a partir do corretor atual (currentId), percorrendo a
 * ordem circular de posições.
 *
 * Regra (conforme especificação):
 *  - Corretor indisponível: é ignorado, bolas não são tocadas.
 *  - Corretor disponível com bolas > 0: perde 1 bola e é pulado.
 *  - Corretor disponível com 0 bolas: recebe a vez (para a busca).
 *
 * Como um corretor pode ter até 2 bolas, pode ser necessário percorrer a
 * fila mais de uma volta completa até alguém ficar elegível — por isso o
 * limite de passos é (n * (MAX_BOLAS + 1)) + 1, e não apenas n.
 *
 * @param {Array} corretores - lista de corretores {id, posicao, bolas, disponivel}
 * @param {string|number|null} currentId - id do corretor atualmente na vez (ou null)
 * @returns {{ nextId: string|number|null, consumidos: Array<{id, antes, depois}> }}
 *   consumidos: lista, na ordem em que foram alcançados, dos corretores que
 *   tiveram 1 bola removida durante esta passagem.
 */
export function avancarFila(corretores, currentId) {
  const ordenados = porPosicao(corretores).map((c) => ({ ...c }))
  const n = ordenados.length
  if (n === 0) return { nextId: null, consumidos: [] }

  let startIdx = ordenados.findIndex((c) => c.id === currentId)
  if (startIdx === -1) startIdx = -1 // ninguém na vez ainda: começa do início (idx 0)

  const consumidos = []
  const maxPassos = n * (MAX_BOLAS + 1) + 1

  for (let passo = 1; passo <= maxPassos; passo++) {
    const idx = (startIdx + passo) % n
    const corretor = ordenados[idx]

    if (!corretor.disponivel) {
      continue
    }

    if (corretor.bolas > 0) {
      const antes = corretor.bolas
      const depois = clampBolas(antes - 1)
      corretor.bolas = depois
      consumidos.push({ id: corretor.id, antes, depois })
      continue
    }

    // Disponível e sem bolas: é o próximo elegível.
    return { nextId: corretor.id, consumidos }
  }

  // Ninguém elegível (ex.: todos indisponíveis).
  return { nextId: null, consumidos }
}

/**
 * "Pular vez": idêntico à busca do avançarFila (o corretor atual não
 * acumula penalidade por ser pulado manualmente — ele apenas deixa de
 * estar na vez). Mantido como função própria para deixar a intenção
 * explícita nas chamadas e no histórico.
 */
export function pularVez(corretores, currentId) {
  return avancarFila(corretores, currentId)
}

/**
 * Aplica manualmente um ajuste de bolas a um corretor (+1, +2, -1, limpar),
 * sempre respeitando os limites 0..MAX_BOLAS.
 * @param {number} bolasAtuais
 * @param {'add1'|'add2'|'sub1'|'clear'} acao
 */
export function ajustarBolasManual(bolasAtuais, acao) {
  switch (acao) {
    case 'add1':
      return clampBolas(bolasAtuais + 1)
    case 'add2':
      return clampBolas(bolasAtuais + 2)
    case 'sub1':
      return clampBolas(bolasAtuais - 1)
    case 'clear':
      return 0
    default:
      return clampBolas(bolasAtuais)
  }
}

/**
 * Deriva o "status" de exibição de um corretor para a tela da TV.
 * @returns {'VEZ'|'INDISPONIVEL'|'COM_BOLA'|'AGUARDANDO'}
 */
export function statusExibicao(corretor, currentId) {
  if (corretor.id === currentId) return 'VEZ'
  if (!corretor.disponivel) return 'INDISPONIVEL'
  if (corretor.bolas > 0) return 'COM_BOLA'
  return 'AGUARDANDO'
}

/**
 * Monta a ordem de exibição da fila para a TV/admin: começa no corretor
 * atual e segue a ordem circular de posições, terminando um passo antes
 * de voltar a ele (ou toda a lista, se ninguém está na vez).
 */
export function ordemDeExibicao(corretores, currentId) {
  const ordenados = porPosicao(corretores)
  const n = ordenados.length
  if (n === 0) return []
  let startIdx = ordenados.findIndex((c) => c.id === currentId)
  if (startIdx === -1) return ordenados
  const resultado = []
  for (let i = 1; i <= n - 1; i++) {
    resultado.push(ordenados[(startIdx + i) % n])
  }
  return resultado
}
