import React, { useState } from 'react'

export default function AddBrokerForm({ proximaPosicaoSugerida, onAdicionar }) {
  const [nome, setNome] = useState('')
  const [posicao, setPosicao] = useState(String(proximaPosicaoSugerida))
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    const pos = parseInt(posicao, 10)
    if (!nome.trim()) {
      setErro('Informe o nome do corretor.')
      return
    }
    if (Number.isNaN(pos) || pos < 1) {
      setErro('Informe uma posição válida (número inteiro ≥ 1).')
      return
    }
    try {
      await onAdicionar({ nome: nome.trim(), posicao: pos })
      setNome('')
      setPosicao(String(pos + 1))
      setAberto(false)
    } catch (err) {
      setErro(err?.message?.includes('posicao_unica') ? 'Já existe um corretor nessa posição.' : 'Erro ao adicionar corretor.')
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="rounded-lg border border-dashed border-ink-600 text-paper/70 hover:text-paper hover:border-brass-400 px-4 py-2.5 text-sm font-medium transition-colors"
      >
        + Adicionar corretor
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 bg-ink-800 border border-ink-700 rounded-lg p-4">
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-paper/50 mb-1">Nome</label>
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="rounded-md bg-ink-900 border border-ink-600 px-3 py-2 text-sm text-paper"
          placeholder="Nome do corretor"
        />
      </div>
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-paper/50 mb-1">Posição</label>
        <input
          type="number"
          min={1}
          value={posicao}
          onChange={(e) => setPosicao(e.target.value)}
          className="w-24 rounded-md bg-ink-900 border border-ink-600 px-3 py-2 text-sm text-paper"
        />
      </div>
      <button type="submit" className="rounded-md bg-brass-400 hover:bg-brass-500 text-ink-950 font-semibold px-4 py-2 text-sm">
        Salvar
      </button>
      <button
        type="button"
        onClick={() => setAberto(false)}
        className="rounded-md bg-ink-700 hover:bg-ink-600 text-paper px-4 py-2 text-sm"
      >
        Cancelar
      </button>
      {erro && <p className="text-signal-stop text-xs w-full font-body">{erro}</p>}
    </form>
  )
}
