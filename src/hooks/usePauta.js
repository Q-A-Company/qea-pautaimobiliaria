import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCorretores, fetchEstado, subscribeRealtime } from '../lib/pautaService'

/**
 * Hook central de dados: busca corretores + estado da pauta e mantém tudo
 * sincronizado via Supabase Realtime. Usado tanto no /admin quanto na /tv,
 * garantindo que as duas telas nunca precisem de reload manual.
 */
export function usePauta() {
  const [corretores, setCorretores] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const prevCurrentId = useRef(undefined)
  const [justChanged, setJustChanged] = useState(false)

  const reload = useCallback(async () => {
    try {
      const [listaCorretores, estado] = await Promise.all([fetchCorretores(), fetchEstado()])
      setCorretores(listaCorretores)
      const novoAtualId = estado?.corretor_atual_id ?? null

      if (prevCurrentId.current !== undefined && prevCurrentId.current !== novoAtualId) {
        setJustChanged(true)
      }
      prevCurrentId.current = novoAtualId
      setCurrentId(novoAtualId)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
    const unsubscribe = subscribeRealtime(() => {
      reload()
    })
    return unsubscribe
  }, [reload])

  const clearJustChanged = useCallback(() => setJustChanged(false), [])

  const corretorAtual = corretores.find((c) => c.id === currentId) ?? null

  return {
    corretores,
    currentId,
    corretorAtual,
    loading,
    error,
    reload,
    justChanged,
    clearJustChanged,
  }
}
