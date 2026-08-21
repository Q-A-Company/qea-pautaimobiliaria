import React, { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    const to = location.state?.from?.pathname || '/admin'
    return <Navigate to={to} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError('E-mail ou senha inválidos. Verifique e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-11 w-11 rounded-lg bg-brass-400 flex items-center justify-center">
            <span className="font-display text-ink-950 text-lg">Q</span>
          </div>
          <h1 className="font-display text-paper text-2xl tracking-tight">PAUTA DE CORRETORES</h1>
          <p className="text-paper/50 text-sm mt-1 font-body">Acesso restrito à administração</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-ink-900 border border-ink-700 rounded-2xl p-6 shadow-panel space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-xs font-mono uppercase tracking-wider text-paper/50 mb-1.5">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-ink-800 border border-ink-600 text-paper px-3.5 py-2.5 text-sm focus:border-brass-400 focus:outline-none"
              placeholder="admin@imobiliaria.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-mono uppercase tracking-wider text-paper/50 mb-1.5"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-ink-800 border border-ink-600 text-paper px-3.5 py-2.5 text-sm focus:border-brass-400 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-signal-stop text-sm font-body">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brass-400 hover:bg-brass-500 disabled:opacity-60 text-ink-950 font-semibold py-2.5 text-sm transition-colors"
          >
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-paper/30 text-xs mt-6 font-body">
          A tela pública para TV não exige login —{' '}
          <a href="/tv" className="underline hover:text-paper/60">
            acessar /tv
          </a>
        </p>
      </div>
    </div>
  )
}
