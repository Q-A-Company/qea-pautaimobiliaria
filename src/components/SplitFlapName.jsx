import React, { useEffect, useState } from 'react'

// Tamanho "base" (em rem) do nome por faixa de largura de tela — mesma
// ideia das media queries que já usávamos, mas calculado em JS para que
// também possamos reduzir o tamanho quando o nome é comprido. Usar um
// valor numérico simples (em vez de clamp()) mantém a compatibilidade
// com navegadores de TV muito antigos, que não entendem clamp().
const TIERS = [
  { minWidth: 1536, remBase: 9.5 },
  { minWidth: 1024, remBase: 7.5 },
  { minWidth: 640, remBase: 5.5 },
  { minWidth: 0, remBase: 3.25 },
]

function getRemBaseForWidth(width) {
  const tier = TIERS.find((t) => width >= t.minWidth)
  return (tier || TIERS[TIERS.length - 1]).remBase
}

// Nomes de até 7 letras usam o tamanho cheio da faixa. A partir disso,
// o tamanho reduz proporcionalmente para caber no quadro (com um piso
// para não ficar ilegível), evitando que nomes grandes como "LEONARDO"
// ou "GUILHERME" estourem o card — em qualquer largura de tela.
function computeFontSizeRem(nome, width) {
  const base = getRemBaseForWidth(width)
  const length = (nome || '—').length || 1
  const confortavel = 7
  const escala = length > confortavel ? Math.max(confortavel / length, 0.42) : 1
  return Math.round(base * escala * 100) / 100
}

/**
 * Elemento de assinatura visual da tela de TV: o nome do corretor da vez
 * "vira" como um painel de aeroporto (split-flap) sempre que muda —
 * referência direta ao conceito de rodízio/fila e uma "chamada" pública.
 */
export default function SplitFlapName({ nome }) {
  const [display, setDisplay] = useState(nome || '—')
  const [flipping, setFlipping] = useState(false)
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280))

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (nome === display) return
    setFlipping(true)
    const t = setTimeout(() => {
      setDisplay(nome || '—')
      setFlipping(false)
    }, 180)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome])

  const fontSizeRem = computeFontSizeRem(display, width)

  return (
    <div className="flip-card w-full">
      <div
        key={display}
        className="origin-bottom will-change-transform animate-flap-in"
        style={{ animationDuration: flipping ? '0.18s' : '0.55s' }}
      >
        <span
          className="tv-broker-name block font-display uppercase tracking-tight text-white text-balance"
          style={{
            fontSize: `${fontSizeRem}rem`,
            lineHeight: 1,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {display}
        </span>
      </div>
    </div>
  )
}
