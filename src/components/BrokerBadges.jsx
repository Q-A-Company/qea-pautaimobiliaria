import React from 'react'

/** Duas bolinhas indicando a quantidade de bolas (0, 1 ou 2). */
export function BolasIndicator({ bolas = 0, size = 'md' }) {
  const dims =
    size === 'xl' ? 'w-7 h-7' : size === 'lg' ? 'w-5 h-5' : size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${bolas} bola(s)`}>
      {[0, 1].map((i) => (
        <span
          key={i}
          className={`${dims} rounded-full border-2 transition-colors ${
            i < bolas ? 'bg-signal-stop border-signal-stop' : 'bg-transparent border-current opacity-30'
          }`}
        />
      ))}
    </span>
  )
}

const STATUS_LABEL = {
  VEZ: 'NA VEZ',
  AGUARDANDO: 'AGUARDANDO',
  INDISPONIVEL: 'INDISPONÍVEL',
  COM_BOLA: 'COM BOLA',
}

const STATUS_STYLE = {
  VEZ: 'bg-brass-400 text-ink-950',
  AGUARDANDO: 'bg-ink-700 text-paper/80',
  INDISPONIVEL: 'bg-signal-stop/20 text-signal-stop',
  COM_BOLA: 'bg-signal-wait/20 text-signal-wait',
}

const PILL_SIZE = {
  sm: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-base',
  xl: 'px-5 py-2 text-xl',
}

export function StatusPill({ status, size = 'sm', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-mono font-semibold uppercase tracking-wider ${PILL_SIZE[size]} ${STATUS_STYLE[status]} ${className}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
