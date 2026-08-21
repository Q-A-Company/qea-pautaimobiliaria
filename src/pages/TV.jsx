import React, { useEffect } from 'react'
import { usePauta } from '../hooks/usePauta'
import { useCallChime } from '../hooks/useCallChime'
import { statusExibicao, ordemDeExibicao } from '../lib/queueLogic'
import { BolasIndicator, StatusPill } from '../components/BrokerBadges'
import SplitFlapName from '../components/SplitFlapName'

export default function TV() {
  const { corretores, currentId, corretorAtual, loading, justChanged, clearJustChanged } = usePauta()
  const { enabled, toggle, play } = useCallChime()

  useEffect(() => {
    if (justChanged) {
      play()
      clearJustChanged()
    }
  }, [justChanged, play, clearJustChanged])

  const disponiveis = corretores.filter((c) => c.disponivel)
  const indisponiveis = corretores.filter((c) => !c.disponivel)
  const proximosCircular = ordemDeExibicao(disponiveis, currentId)
  // Quem está com bola (vai ser pulado na próxima passagem) aparece no
  // final da lista, mantendo a ordem circular entre os dois grupos.
  const proximos = [
    ...proximosCircular.filter((c) => c.bolas === 0),
    ...proximosCircular.filter((c) => c.bolas > 0),
  ]

  return (
    <div className="min-h-screen bg-ink-950 bg-gradient-to-b from-ink-950 via-ink-950 to-ink-900 text-paper font-body flex flex-col overflow-y-auto">
      <header className="pt-5 sm:pt-10 px-4 sm:px-14 flex items-center justify-between gap-3">
        <p className="font-mono text-brass-400 text-sm sm:text-lg uppercase tracking-[0.2em] sm:tracking-[0.35em] truncate">
          Pauta de Corretores
        </p>
        <button
          onClick={toggle}
          className={`shrink-0 rounded-full border px-3 py-1.5 sm:px-5 sm:py-2.5 text-xs sm:text-base font-mono uppercase tracking-wider transition-colors ${
            enabled
              ? 'bg-ink-800/80 border-ink-600 text-paper/70 hover:text-paper'
              : 'bg-brass-400/20 border-brass-400/40 text-brass-200'
          }`}
        >
          {enabled ? '🔊' : '🔇'} <span className="hidden sm:inline">Som: {enabled ? 'Ativado' : 'Desativado'}</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row px-4 sm:px-14 py-6 sm:py-8">
        {/* Corretor da vez */}
        <section className="flex flex-col items-center justify-center text-center mb-10 lg:mb-0 lg:w-3/5 lg:pr-10">
          <p className="font-mono text-white text-base sm:text-xl uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-4 sm:mb-6 font-semibold">
            Corretor da vez
          </p>
          {loading ? (
            <div className="h-24 w-64 bg-ink-800 rounded-xl animate-pulse" />
          ) : (
            <div className="w-full max-w-full rounded-[1.5rem] sm:rounded-[2rem] bg-ink-700 border border-brass-400/40 shadow-panel px-4 py-6 sm:px-14 sm:py-14 overflow-hidden">
              <SplitFlapName nome={corretorAtual?.nome} />
            </div>
          )}
          {corretorAtual && (
            <div className="mt-6 flex items-center text-paper/50 font-mono text-xl sm:text-2xl">
              <span>Posição {corretorAtual.posicao}</span>
              <span aria-hidden className="mx-3">
                •
              </span>
              <BolasIndicator bolas={0} size="lg" />
            </div>
          )}
          {!loading && !corretorAtual && (
            <p className="text-paper/40 text-xl mt-4 font-body">Aguardando início do rodízio…</p>
          )}
        </section>

        {/* Próximos + Indisponíveis */}
        <section className="flex flex-col min-h-0 lg:w-2/5">
          <div className="flex-1 min-h-0">
            <p className="flex items-center font-mono text-brass-200 text-xl sm:text-2xl uppercase tracking-[0.3em] mb-4 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-brass-400 mr-3 shrink-0" aria-hidden />
              Próximos corretores
            </p>
            <ul className="space-y-3">
              {proximos.map((c, i) => {
                const status = statusExibicao(c, currentId)
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-xl bg-ink-900/70 border border-ink-700/60 px-5 py-4 animate-slide-up-fade"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center">
                      <span className="font-mono text-paper/30 text-lg w-8">{c.posicao}</span>
                      <span className="font-display text-2xl sm:text-3xl tracking-tight uppercase ml-3">
                        {c.nome}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <BolasIndicator bolas={c.bolas} size="lg" />
                      <span className="ml-4">
                        <StatusPill status={status} size="lg" />
                      </span>
                    </div>
                  </li>
                )
              })}
              {proximos.length === 0 && !loading && (
                <li className="text-paper/30 text-lg font-body px-1">Nenhum outro corretor disponível.</li>
              )}
            </ul>
          </div>

          {indisponiveis.length > 0 && (
            <div className="mt-8">
              <p className="font-mono text-paper/40 text-lg sm:text-xl uppercase tracking-[0.3em] mb-3">
                Corretores indisponíveis
              </p>
              <ul className="flex flex-wrap">
                {indisponiveis.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl bg-signal-stop/15 border border-signal-stop/30 text-signal-stop px-5 py-3 text-2xl sm:text-3xl font-display uppercase tracking-tight mr-3 mb-3"
                  >
                    {c.nome}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>

      <footer className="px-4 sm:px-14 pb-5 text-center">
        <p className="font-mono text-paper/20 text-sm uppercase tracking-widest">
          Atualização automática em tempo real · Q&A Company
        </p>
      </footer>
    </div>
  )
}
