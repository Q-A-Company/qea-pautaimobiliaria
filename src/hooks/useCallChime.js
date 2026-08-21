import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Toca um sinal sonoro curto e profissional de "chamada" usando a Web
 * Audio API (dois tons ascendentes tipo campainha de recepção), sem
 * depender de nenhum arquivo de áudio externo.
 *
 * O som já fica ATIVADO por padrão. A única ressalva é técnica, não de
 * produto: navegadores bloqueiam qualquer áudio antes da primeira
 * interação do usuário na página. Por isso, além de já nascer "ligado",
 * o hook escuta silenciosamente o primeiro clique/toque/tecla em
 * qualquer lugar da tela para destravar o áudio automaticamente — sem
 * precisar de um botão dedicado. Se o navegador já permitir (ex.: TV já
 * teve alguma interação), o som funciona desde o primeiro corretor
 * chamado.
 */
export function useCallChime() {
  const ctxRef = useRef(null)
  const [enabled, setEnabled] = useState(true)
  const [unlocked, setUnlocked] = useState(false)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      ctxRef.current = new AudioCtx()
    }
    return ctxRef.current
  }, [])

  const unlock = useCallback(() => {
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
    setUnlocked(true)
  }, [getCtx])

  // Destrava o áudio automaticamente na primeira interação do usuário
  // com a página (clique, toque ou tecla), sem exigir um botão visível.
  useEffect(() => {
    if (unlocked) return
    const handler = () => unlock()
    window.addEventListener('pointerdown', handler)
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('pointerdown', handler)
      window.removeEventListener('keydown', handler)
    }
  }, [unlocked, unlock])

  const disable = useCallback(() => setEnabled(false), [])
  const enable = useCallback(() => setEnabled(true), [])
  const toggle = useCallback(() => setEnabled((v) => !v), [])

  const play = useCallback(() => {
    if (!enabled) return
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()

    const now = ctx.currentTime
    const notes = [
      { freq: 659.25, start: 0, dur: 0.16 }, // Mi
      { freq: 987.77, start: 0.16, dur: 0.28 }, // Si (campainha de recepção)
    ]

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.28, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.02)
    })
  }, [enabled, getCtx])

  return { enabled, unlocked, unlock, disable, enable, toggle, play }
}
