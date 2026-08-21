import React, { useState } from 'react'
import { BolasIndicator } from './BrokerBadges'

export default function AdminBrokerTable({
  corretores,
  currentId,
  onAjustarBolas,
  onToggleDisponivel,
  onEditar,
  onRemover,
  onSelecionar,
}) {
  const [editandoId, setEditandoId] = useState(null)
  const [rascunho, setRascunho] = useState({ nome: '', posicao: '' })

  function iniciarEdicao(c) {
    setEditandoId(c.id)
    setRascunho({ nome: c.nome, posicao: String(c.posicao) })
  }

  function cancelarEdicao() {
    setEditandoId(null)
  }

  function salvarEdicao(id) {
    const posicao = parseInt(rascunho.posicao, 10)
    if (!rascunho.nome.trim() || Number.isNaN(posicao)) return
    onEditar(id, { nome: rascunho.nome.trim(), posicao })
    setEditandoId(null)
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-700/60" style={{ WebkitOverflowScrolling: 'touch' }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-ink-800 text-paper/60 font-mono text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-20">Posição</th>
            <th className="px-4 py-3 text-left">Corretor</th>
            <th className="px-4 py-3 text-left w-32">Bolas</th>
            <th className="px-4 py-3 text-left w-36">Status</th>
            <th className="px-4 py-3 text-left">Ações</th>
          </tr>
        </thead>
        <tbody>
          {corretores.map((c) => {
            const isAtual = c.id === currentId
            const editando = editandoId === c.id
            return (
              <tr
                key={c.id}
                className={`border-t border-ink-700/60 ${
                  isAtual ? 'bg-brass-400/10' : 'bg-ink-900 odd:bg-ink-900/60'
                }`}
              >
                <td className="px-4 py-3 font-mono text-paper/70">
                  {editando ? (
                    <input
                      type="number"
                      value={rascunho.posicao}
                      onChange={(e) => setRascunho((r) => ({ ...r, posicao: e.target.value }))}
                      className="w-16 rounded bg-ink-800 border border-ink-600 px-2 py-1 text-paper"
                    />
                  ) : (
                    c.posicao
                  )}
                </td>
                <td className="px-4 py-3">
                  {editando ? (
                    <input
                      type="text"
                      value={rascunho.nome}
                      onChange={(e) => setRascunho((r) => ({ ...r, nome: e.target.value }))}
                      className="w-full rounded bg-ink-800 border border-ink-600 px-2 py-1 text-paper"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelecionar(c)}
                      disabled={!c.disponivel || isAtual}
                      title={
                        isAtual
                          ? 'Já é o corretor da vez'
                          : c.disponivel
                            ? 'Clique para colocar este corretor na vez agora'
                            : 'Corretor indisponível'
                      }
                      className={`font-medium text-left disabled:cursor-default ${
                        isAtual
                          ? 'text-brass-400'
                          : c.disponivel
                            ? 'text-paper hover:text-brass-400 hover:underline underline-offset-2 cursor-pointer'
                            : 'text-paper/40 cursor-not-allowed'
                      }`}
                    >
                      {c.nome}
                      {isAtual && <span className="ml-2 text-[10px] font-mono text-brass-400 align-middle">● VEZ</span>}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-paper">
                  <BolasIndicator bolas={c.bolas} />
                  <span className="ml-2 font-mono text-paper/50 text-xs">{c.bolas}/2</span>
                </td>
                <td className="px-4 py-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={c.disponivel}
                      onChange={(e) => onToggleDisponivel(c, e.target.checked)}
                      className="sr-only peer"
                    />
                    <span
                      className={`h-5 w-9 rounded-full transition-colors relative ${
                        c.disponivel ? 'bg-signal-go' : 'bg-signal-stop'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          c.disponivel ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                    <span className="text-xs font-mono text-paper/70">
                      {c.disponivel ? 'Disponível' : 'Indisponível'}
                    </span>
                  </label>
                </td>
                <td className="px-4 py-3">
                  {editando ? (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => salvarEdicao(c.id)}
                        className="rounded-md bg-brass-400 text-ink-950 px-2.5 py-1 text-xs font-semibold hover:bg-brass-500"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={cancelarEdicao}
                        className="rounded-md bg-ink-700 text-paper px-2.5 py-1 text-xs hover:bg-ink-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => onAjustarBolas(c, 'add1')}
                        className="rounded-md bg-ink-700 text-paper px-2.5 py-1 text-xs hover:bg-ink-600"
                        title="Adicionar 1 bola"
                      >
                        +1 bola
                      </button>
                      <button
                        onClick={() => onAjustarBolas(c, 'add2')}
                        className="rounded-md bg-ink-700 text-paper px-2.5 py-1 text-xs hover:bg-ink-600"
                        title="Adicionar 2 bolas"
                      >
                        +2 bolas
                      </button>
                      <button
                        onClick={() => onAjustarBolas(c, 'sub1')}
                        className="rounded-md bg-ink-700 text-paper px-2.5 py-1 text-xs hover:bg-ink-600"
                        title="Remover 1 bola"
                      >
                        -1 bola
                      </button>
                      <button
                        onClick={() => onAjustarBolas(c, 'clear')}
                        className="rounded-md bg-ink-700 text-paper px-2.5 py-1 text-xs hover:bg-ink-600"
                        title="Limpar bolas"
                      >
                        Limpar
                      </button>
                      <button
                        onClick={() => iniciarEdicao(c)}
                        className="rounded-md bg-ink-700 text-paper px-2.5 py-1 text-xs hover:bg-ink-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onRemover(c)}
                        className="rounded-md bg-signal-stop/20 text-signal-stop px-2.5 py-1 text-xs hover:bg-signal-stop/30"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
          {corretores.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-paper/40 font-body">
                Nenhum corretor cadastrado ainda. Adicione o primeiro acima.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
