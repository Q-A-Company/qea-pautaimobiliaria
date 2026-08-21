import React, { useEffect, useRef, useState } from 'react'
import { verificarCodigoTv } from '../lib/pautaService'

const STORAGE_KEY = 'pauta_tv_access_granted'

/**
 * Proteção leve para a tela pública da TV — sem exigir login completo
 * (a TV continua sem usuário/senha). Pede um código de 4 dígitos que é
 * gerado e exibido no painel /admin (TvCodePanel). O código verdadeiro
 * nunca trafega para quem está tentando entrar: a verificação acontece
 * no banco (função verificar_codigo_tv), que só responde certo/errado.
 *
 * Uma vez validado com sucesso, o dispositivo fica liberado
 * permanentemente (guardado no localStorage) — não pede o código de
 * novo, mesmo que o administrador gere um código novo depois (trocar o
 * código serve para liberar novos dispositivos, não para "deslogar" os
 * que já têm acesso).
 */
export default function TvAccessGate({ children }) {
  const [granted, setGranted] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [digits, setDigits] = useState(['', '', '', ''])
  const [verificando, setVerificando] = useState(false)
  const [erro, setErro] = useState(false)
  const [tentouUrl, setTentouUrl] = useState(false)
  const inputsRef = useRef([])

  function grant() {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // localStorage indisponível (modo privado etc.) — segue sem persistir
    }
    setGranted(true)
  }

  // Conveniência: se o link usado já trouxer ?codigo=1234 (compartilhado
  // uma única vez com quem configura a TV), tenta validar automaticamente.
  useEffect(() => {
    if (granted || tentouUrl) return
    setTentouUrl(true)
    let codigoUrl = null
    try {
      codigoUrl = new URLSearchParams(window.location.search).get('codigo')
    } catch {
      codigoUrl = null
    }
    if (codigoUrl && /^\d{4}$/.test(codigoUrl)) {
      verificarCodigoTv(codigoUrl)
        .then((ok) => {
          if (ok) {
            grant()
            const url = new URL(window.location.href)
            url.searchParams.delete('codigo')
            window.history.replaceState({}, '', url.toString())
          }
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granted, tentouUrl])

  async function handleVerificar(codigoCompleto) {
    setVerificando(true)
    setErro(false)
    try {
      const ok = await verificarCodigoTv(codigoCompleto)
      if (ok) {
        grant()
      } else {
        setErro(true)
        setDigits(['', '', '', ''])
        inputsRef.current[0]?.focus()
      }
    } catch {
      setErro(true)
    } finally {
      setVerificando(false)
    }
  }

  function handleDigitChange(index, value) {
    const clean = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = clean
    setDigits(next)
    setErro(false)

    if (clean && index < 3) {
      inputsRef.current[index + 1]?.focus()
    }
    if (next.every((d) => d !== '')) {
      handleVerificar(next.join(''))
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  if (granted) return children

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4 text-paper font-body">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 h-11 w-11 rounded-lg bg-brass-400 flex items-center justify-center">
          <span className="font-display text-ink-950 text-lg">Q</span>
        </div>
        <h1 className="font-display text-xl tracking-tight mb-2">ACESSO RESTRITO</h1>
        <p className="text-paper/50 text-sm mb-6 font-body">
          Digite o código de 4 dígitos gerado no painel administrativo para liberar esta tela.
        </p>

        <div className="flex items-center justify-center gap-3 mb-4">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              disabled={verificando}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
              className={`w-14 h-16 text-center text-2xl font-mono rounded-lg bg-ink-900 border text-paper focus:outline-none ${
                erro ? 'border-signal-stop' : 'border-ink-600 focus:border-brass-400'
              }`}
            />
          ))}
        </div>

        {verificando && <p className="text-paper/40 text-sm font-body">Verificando…</p>}
        {erro && !verificando && (
          <p className="text-signal-stop text-sm font-body">Código incorreto. Tente novamente.</p>
        )}
      </div>
    </div>
  )
}
