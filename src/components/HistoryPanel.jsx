import React, { useEffect, useState } from 'react'
import { fetchHistorico, subscribeHistorico, limparHistorico } from '../lib/pautaService'

function formatHora(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const ACAO_COR = {
  chamado: 'text-brass-400',
  bola_removida: 'text-signal-wait',
  bola_restaurada: 'text-signal-go',
  indisponivel: 'text-signal-stop',
  disponivel: 'text-signal-go',
  voltar: 'text-paper/70',
  pulado_manual: 'text-signal-wait',
  selecionado_manual: 'text-brass-400',
  bola_manual: 'text-signal-wait',
  criado: 'text-signal-go',
  editado: 'text-paper/70',
  removido: 'text-signal-stop',
  codigo_tv_alterado: 'text-brass-400',
}

export default function HistoryPanel() {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [limpando, setLimpando] = useState(false)

  useEffect(() => {
    let mounted = true
    fetchHistorico(80).then((data) => {
      if (mounted) {
        setItens(data)
        setLoading(false)
      }
    })
    const unsubscribe = subscribeHistorico((payload) => {
      setItens((prev) => [payload.new, ...prev].slice(0, 80))
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  async function handleLimpar() {
    if (!window.confirm('Apagar todo o histórico? Essa ação não pode ser desfeita.')) return
    setLimpando(true)
    try {
      await limparHistorico()
      setItens([])
    } catch (err) {
      console.error(err)
      window.alert('Não foi possível limpar o histórico. Tente novamente.')
    } finally {
      setLimpando(false)
    }
  }

  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-900 max-h-[420px] overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-end bg-ink-900 border-b border-ink-700/60 px-4 py-2">
        <button
          onClick={handleLimpar}
          disabled={limpando || itens.length === 0}
          className="rounded-md bg-ink-800 hover:bg-ink-700 disabled:opacity-40 text-paper/70 hover:text-paper px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors"
        >
          {limpando ? 'Limpando…' : 'Limpar histórico'}
        </button>
      </div>
      {loading && <p className="p-4 text-paper/40 text-sm font-body">Carregando histórico…</p>}
      {!loading && itens.length === 0 && (
        <p className="p-4 text-paper/40 text-sm font-body">Nenhuma movimentação registrada ainda.</p>
      )}
      <ul className="divide-y divide-ink-700/60">
        {itens.map((item) => (
          <li key={item.id} className="px-4 py-2.5 text-sm flex items-start gap-3">
            <span className="font-mono text-paper/40 text-xs mt-0.5 shrink-0">{formatHora(item.created_at)}</span>
            <span className={`font-body ${ACAO_COR[item.acao] || 'text-paper/80'}`}>{item.descricao}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
