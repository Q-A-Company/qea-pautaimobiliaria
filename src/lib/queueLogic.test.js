import { describe, it, expect } from 'vitest'
import {
  avancarFila,
  pularVez,
  ajustarBolasManual,
  clampBolas,
  statusExibicao,
  ordemDeExibicao,
} from './queueLogic'

function brokers(overrides = {}) {
  const base = [
    { id: 'paulo', posicao: 1, bolas: 0, disponivel: true },
    { id: 'joao', posicao: 2, bolas: 0, disponivel: true },
    { id: 'kleber', posicao: 3, bolas: 0, disponivel: true },
  ]
  return base.map((b) => ({ ...b, ...(overrides[b.id] || {}) }))
}

describe('exemplo completo da especificação', () => {
  it('reproduz exatamente a sequência descrita no brief', () => {
    let list = brokers({ joao: { bolas: 2 } })
    let current = 'paulo'

    // Clique 1: Paulo -> João(2 bolas, vira 1, pulado) -> Kleber (vez)
    let r1 = avancarFila(list, current)
    expect(r1.nextId).toBe('kleber')
    expect(r1.consumidos).toEqual([{ id: 'joao', antes: 2, depois: 1 }])
    // aplica bolas consumidas na lista "persistida"
    list = list.map((b) => {
      const c = r1.consumidos.find((x) => x.id === b.id)
      return c ? { ...b, bolas: c.depois } : b
    })
    current = r1.nextId
    expect(list.find((b) => b.id === 'joao').bolas).toBe(1)

    // Clique 2: Kleber -> Paulo (vez, 0 bolas)
    let r2 = avancarFila(list, current)
    expect(r2.nextId).toBe('paulo')
    expect(r2.consumidos).toEqual([])
    current = r2.nextId

    // Clique 3: Paulo -> João (1 bola, vira 0, pulado) -> Kleber (vez)
    let r3 = avancarFila(list, current)
    expect(r3.nextId).toBe('kleber')
    expect(r3.consumidos).toEqual([{ id: 'joao', antes: 1, depois: 0 }])
    list = list.map((b) => {
      const c = r3.consumidos.find((x) => x.id === b.id)
      return c ? { ...b, bolas: c.depois } : b
    })
    current = r3.nextId
    expect(list.find((b) => b.id === 'joao').bolas).toBe(0)

    // Próxima passagem: João já pode receber a vez normalmente.
    // Kleber -> Paulo -> João deve ficar elegível na volta seguinte.
    let r4 = avancarFila(list, current) // kleber -> paulo
    expect(r4.nextId).toBe('paulo')
    current = r4.nextId
    let r5 = avancarFila(list, current) // paulo -> joao (0 bolas agora)
    expect(r5.nextId).toBe('joao')
    expect(r5.consumidos).toEqual([])
  })
})

describe('regras de bolas', () => {
  it('nunca ultrapassa 2 bolas nem fica negativo', () => {
    expect(clampBolas(5)).toBe(2)
    expect(clampBolas(-3)).toBe(0)
    expect(ajustarBolasManual(2, 'add1')).toBe(2)
    expect(ajustarBolasManual(2, 'add2')).toBe(2)
    expect(ajustarBolasManual(0, 'sub1')).toBe(0)
    expect(ajustarBolasManual(1, 'clear')).toBe(0)
  })

  it('corretor com 2 bolas é pulado duas vezes antes de receber a vez', () => {
    let list = brokers({ joao: { bolas: 2 } })
    // paulo na vez -> avança para joao (2->1, pulado) -> kleber recebe a vez
    let r1 = avancarFila(list, 'paulo')
    expect(r1.nextId).toBe('kleber')
    list = applyConsumed(list, r1.consumidos)
    expect(getBolas(list, 'joao')).toBe(1)

    // kleber -> paulo (vez)
    let r2 = avancarFila(list, 'kleber')
    expect(r2.nextId).toBe('paulo')

    // paulo -> joao (1->0, pulado) -> kleber (vez)
    let r3 = avancarFila(list, 'paulo')
    expect(r3.nextId).toBe('kleber')
    list = applyConsumed(list, r3.consumidos)
    expect(getBolas(list, 'joao')).toBe(0)

    // kleber -> paulo -> joao (agora elegível, 0 bolas)
    let r4 = avancarFila(list, 'kleber')
    let r5 = avancarFila(list, r4.nextId)
    expect(r5.nextId).toBe('joao')
  })
})

describe('corretores indisponíveis', () => {
  it('nunca recebem a vez e não têm bolas alteradas', () => {
    let list = brokers({ joao: { disponivel: false, bolas: 1 } })
    const r1 = avancarFila(list, 'paulo')
    // joao está indisponível: deve ser ignorado (sem consumir bola) e ir direto para kleber
    expect(r1.nextId).toBe('kleber')
    expect(r1.consumidos).toEqual([])
  })

  it('ao voltar a ficar disponível, mantém posição e bolas', () => {
    let list = brokers({ joao: { disponivel: false, bolas: 1 } })
    const joao = list.find((b) => b.id === 'joao')
    joao.disponivel = true
    expect(joao.posicao).toBe(2)
    expect(joao.bolas).toBe(1)
  })

  it('fila circular pula todos indisponíveis exceto um', () => {
    const list = brokers({
      joao: { disponivel: false },
      kleber: { disponivel: false },
    })
    const r = avancarFila(list, 'paulo')
    // única volta possível é para o próprio paulo (única pessoa disponível)
    expect(r.nextId).toBe('paulo')
  })
})

describe('fila circular', () => {
  it('do último corretor volta para o primeiro', () => {
    const list = brokers()
    const r = avancarFila(list, 'kleber')
    expect(r.nextId).toBe('paulo')
  })

  it('quando ninguém está na vez ainda, começa do primeiro da fila', () => {
    const list = brokers()
    const r = avancarFila(list, null)
    expect(r.nextId).toBe('paulo')
  })
})

describe('pular vez', () => {
  it('tem o mesmo comportamento de busca do avançar, sem penalizar o atual', () => {
    const list = brokers({ joao: { bolas: 2 } })
    const r = pularVez(list, 'paulo')
    expect(r.nextId).toBe('kleber')
    expect(r.consumidos).toEqual([{ id: 'joao', antes: 2, depois: 1 }])
  })
})

describe('status de exibição', () => {
  it('classifica corretamente cada corretor', () => {
    const list = brokers({ joao: { bolas: 1 }, kleber: { disponivel: false } })
    expect(statusExibicao(list[0], 'paulo')).toBe('VEZ')
    expect(statusExibicao(list[1], 'paulo')).toBe('COM_BOLA')
    expect(statusExibicao(list[2], 'paulo')).toBe('INDISPONIVEL')
  })
})

describe('ordem de exibição', () => {
  it('começa depois do corretor atual e é circular', () => {
    const list = brokers()
    const ordem = ordemDeExibicao(list, 'joao').map((b) => b.id)
    expect(ordem).toEqual(['kleber', 'paulo'])
  })
})

// --- helpers de teste ---
function applyConsumed(list, consumidos) {
  return list.map((b) => {
    const c = consumidos.find((x) => x.id === b.id)
    return c ? { ...b, bolas: c.depois } : b
  })
}
function getBolas(list, id) {
  return list.find((b) => b.id === id).bolas
}
