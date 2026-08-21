import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePauta } from '../hooks/usePauta'
import {
  irParaProximo,
  pularVezAtual,
  voltarUltimoMovimento,
  ajustarBolas,
  definirDisponibilidade,
  selecionarCorretorManualmente,
  adicionarCorretor,
  editarCorretor,
  removerCorretor,
} from '../lib/pautaService'
import AdminBrokerTable from '../components/AdminBrokerTable'
import AddBrokerForm from '../components/AddBrokerForm'
import HistoryPanel from '../components/HistoryPanel'
import TvCodePanel from '../components/TvCodePanel'
import { BolasIndicator } from '../components/BrokerBadges'

export default function Admin() {
  const { user, signOut } = useAuth()
  const { corretores, currentId, corretorAtual, loading, reload } = usePauta()
  const [busy, setBusy] = useState(false)
  const [aviso, setAviso] = useState('')

  async function withBusy(fn) {
    setBusy(true)
    setAviso('')
    try {
      await fn()
    } catch (err) {
      console.error(err)
      setAviso(err?.message || 'Ocorreu um erro. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  const handleProximo = () => withBusy(irParaProximo)
  const handlePular = () => withBusy(pularVezAtual)
  const handleVoltar = () =>
    withBusy(async () => {
      const r = await voltarUltimoMovimento()
      if (!r.ok) setAviso(r.motivo)
    })

  const handleAjustarBolas = (corretor, acao) => withBusy(() => ajustarBolas(corretor, acao))
  const handleToggleDisponivel = (corretor, disponivel) =>
    withBusy(() => definirDisponibilidade(corretor, disponivel))
  const handleSelecionar = (corretor) => withBusy(() => selecionarCorretorManualmente(corretor))
  const handleAdicionar = (dados) => adicionarCorretor(dados)
  const handleEditar = (id, campos) => withBusy(() => editarCorretor(id, campos))
  const handleRemover = (corretor) =>
    withBusy(async () => {
      if (window.confirm(`Remover ${corretor.nome} da fila? Essa ação não pode ser desfeita.`)) {
        await removerCorretor(corretor)
      }
    })

  const proximaPosicao = corretores.length ? Math.max(...corretores.map((c) => c.posicao)) + 1 : 1

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-ink-800 bg-ink-950/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-brass-400 text-[10px] uppercase tracking-[0.2em] mb-0.5">Administração</p>
            <h1 className="font-display text-paper text-lg sm:text-2xl tracking-tight truncate">PAUTA DE CORRETORES</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/tv"
              target="_blank"
              className="hidden sm:inline-flex rounded-lg border border-ink-600 text-paper/70 hover:text-paper hover:border-brass-400 px-3.5 py-2 text-sm font-medium transition-colors"
            >
              Abrir tela da TV ↗
            </Link>
            <div className="text-right hidden sm:block">
              <p className="text-paper/40 text-xs font-body">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg bg-ink-800 hover:bg-ink-700 text-paper/80 px-3.5 py-2 text-sm font-medium transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {aviso && (
          <div className="rounded-lg bg-signal-stop/15 border border-signal-stop/30 text-signal-stop px-4 py-3 text-sm font-body">
            {aviso}
          </div>
        )}

        {/* Card do corretor da vez + controles principais */}
        <section className="bg-ink-900 bg-gradient-to-br from-ink-900 to-ink-800 border border-ink-700 rounded-2xl p-6 sm:p-8 shadow-panel">
          <p className="font-mono text-brass-400 text-xs uppercase tracking-[0.2em] mb-3">Corretor da vez</p>
          {loading ? (
            <p className="text-paper/40 font-body">Carregando…</p>
          ) : corretorAtual ? (
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              <div className="min-w-0">
                <h2 className="font-display text-paper text-3xl sm:text-4xl lg:text-5xl tracking-tight uppercase break-words">
                  {corretorAtual.nome}
                </h2>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-paper/60 font-body">
                  <span>
                    Posição <strong className="text-paper font-mono">{corretorAtual.posicao}</strong>
                  </span>
                  <span className="flex items-center gap-2">
                    Bolas <BolasIndicator bolas={corretorAtual.bolas} />
                  </span>
                  <span className="text-signal-go font-medium">Disponível</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-paper/50 font-body">
              Ninguém está na vez ainda. Clique em <strong>PRÓXIMO</strong> para iniciar o rodízio.
            </p>
          )}

          <div className="flex flex-wrap gap-3 mt-7">
            <button
              onClick={handleProximo}
              disabled={busy || corretores.length === 0}
              className="rounded-xl bg-brass-400 hover:bg-brass-500 disabled:opacity-50 text-ink-950 font-bold px-6 py-3.5 text-base tracking-wide transition-colors"
            >
              PRÓXIMO
            </button>
            <button
              onClick={handleVoltar}
              disabled={busy}
              className="rounded-xl bg-ink-700 hover:bg-ink-600 disabled:opacity-50 text-paper font-semibold px-6 py-3.5 text-base tracking-wide transition-colors"
            >
              VOLTAR
            </button>
            <button
              onClick={handlePular}
              disabled={busy || corretores.length === 0}
              className="rounded-xl bg-ink-800 hover:bg-ink-700 border border-ink-600 disabled:opacity-50 text-paper/90 font-semibold px-6 py-3.5 text-base tracking-wide transition-colors"
            >
              PULAR VEZ
            </button>
          </div>
        </section>

        {/* Tabela de corretores */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-display text-paper text-lg tracking-tight">CORRETORES</h3>
            <AddBrokerForm proximaPosicaoSugerida={proximaPosicao} onAdicionar={handleAdicionar} />
          </div>
          <AdminBrokerTable
            corretores={corretores}
            currentId={currentId}
            onAjustarBolas={handleAjustarBolas}
            onToggleDisponivel={handleToggleDisponivel}
            onEditar={handleEditar}
            onRemover={handleRemover}
            onSelecionar={handleSelecionar}
          />
        </section>

        {/* Código de acesso da TV */}
        <TvCodePanel />

        {/* Histórico */}
        <section className="space-y-4">
          <h3 className="font-display text-paper text-lg tracking-tight">HISTÓRICO</h3>
          <HistoryPanel />
        </section>
      </main>
    </div>
  )
}
