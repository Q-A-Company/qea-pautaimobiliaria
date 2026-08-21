import React, { useEffect, useState } from 'react'
import { buscarCodigoTv, definirCodigoTv, gerarCodigoTvAleatorio } from '../lib/pautaService'

/**
 * Mostra o código de acesso atual da tela da TV e permite gerar um novo
 * (ou definir um específico) direto pelo painel admin — sem precisar de
 * deploy nem configuração externa.
 */
export default function TvCodePanel() {
  const [codigo, setCodigo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState('')
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    let mounted = true
    buscarCodigoTv()
      .then((c) => {
        if (mounted) setCodigo(c)
      })
      .catch(() => {
        if (mounted) setErro('Não foi possível carregar o código. Verifique se a tabela tv_access existe no Supabase.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  async function salvar(novoCodigo) {
    setSalvando(true)
    setErro('')
    try {
      await definirCodigoTv(novoCodigo)
      setCodigo(novoCodigo)
      setEditando(false)
    } catch (err) {
      setErro(err?.message || 'Erro ao salvar o código.')
    } finally {
      setSalvando(false)
    }
  }

  function handleGerar() {
    salvar(gerarCodigoTvAleatorio())
  }

  function handleSalvarManual(e) {
    e.preventDefault()
    if (!/^\d{4}$/.test(rascunho)) {
      setErro('O código precisa ter exatamente 4 dígitos numéricos.')
      return
    }
    salvar(rascunho)
  }

  function handleCopiar() {
    if (!codigo) return
    navigator.clipboard?.writeText(codigo).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    })
  }

  return (
    <section className="bg-ink-900 border border-ink-700 rounded-2xl p-6 sm:p-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h3 className="font-display text-paper text-lg tracking-tight">CÓDIGO DE ACESSO DA TV</h3>
      </div>
      <p className="text-paper/50 text-sm font-body mb-5">
        Informe este código na tela <strong>/tv</strong> para liberar o acesso naquele dispositivo. Só precisa ser
        digitado uma vez por TV/navegador.
      </p>

      {loading ? (
        <p className="text-paper/40 font-body text-sm">Carregando…</p>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {!editando ? (
            <>
              <div className="flex items-center gap-3">
                <span className="font-mono text-4xl sm:text-5xl tracking-[0.3em] text-brass-400 bg-ink-800 border border-ink-600 rounded-xl px-5 py-3">
                  {codigo ?? '----'}
                </span>
                <button
                  onClick={handleCopiar}
                  disabled={!codigo}
                  className="rounded-lg bg-ink-800 hover:bg-ink-700 disabled:opacity-40 text-paper/70 hover:text-paper px-3 py-2 text-xs font-mono uppercase tracking-wider transition-colors"
                >
                  {copiado ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleGerar}
                  disabled={salvando}
                  className="rounded-lg bg-brass-400 hover:bg-brass-500 disabled:opacity-50 text-ink-950 font-semibold px-4 py-2 text-sm transition-colors"
                >
                  {salvando ? 'Gerando…' : 'Gerar novo código'}
                </button>
                <button
                  onClick={() => {
                    setRascunho(codigo || '')
                    setEditando(true)
                    setErro('')
                  }}
                  disabled={salvando}
                  className="rounded-lg bg-ink-800 hover:bg-ink-700 text-paper/80 px-4 py-2 text-sm font-medium transition-colors"
                >
                  Definir código específico
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSalvarManual} className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                autoFocus
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-28 text-center font-mono text-2xl tracking-[0.3em] rounded-lg bg-ink-800 border border-ink-600 text-paper px-3 py-2"
                placeholder="0000"
              />
              <button
                type="submit"
                disabled={salvando}
                className="rounded-lg bg-brass-400 hover:bg-brass-500 disabled:opacity-50 text-ink-950 font-semibold px-4 py-2 text-sm transition-colors"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false)
                  setErro('')
                }}
                className="rounded-lg bg-ink-800 hover:bg-ink-700 text-paper/80 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
            </form>
          )}
        </div>
      )}

      {erro && <p className="text-signal-stop text-sm font-body mt-3">{erro}</p>}
    </section>
  )
}
