'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { emailSchema } from 'shared/validators'
import { GoogleButton } from './google-button'

type SupabaseClient = ReturnType<typeof createClient>

interface LoginModalProps {
  open: boolean
  onClose: () => void
  onAuthenticated: () => void
}

export function LoginModal({ open, onClose, onAuthenticated }: LoginModalProps) {
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setEmail('')
      setPassword('')
      setError('')
      setLoading(false)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const emailResult = emailSchema.safeParse(email)
    if (!emailResult.success) {
      setError(emailResult.error.issues[0]?.message ?? 'Email invalide')
      return
    }
    if (!password) {
      setError('Mot de passe requis')
      return
    }

    setLoading(true)
    try {
      const supabase = getSupabase()
      const { error: pwError } = await supabase.auth.signInWithPassword({ email, password })
      if (pwError) {
        setError(
          pwError.message === 'Invalid login credentials'
            ? 'Email ou mot de passe incorrect'
            : pwError.message,
        )
        return
      }
      onAuthenticated()
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Connexion</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fermer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">Connectez-vous pour continuer</p>

          <div>
            <label htmlFor="modal-email" className="mb-1 block text-sm font-medium text-gray-700">
              Adresse email
            </label>
            <input
              id="modal-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="exemple@mail.com"
              className="block w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="modal-password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <Link href="/forgot-password" className="text-xs text-[#002366] hover:underline">
                Oublié ?
              </Link>
            </div>
            <input
              id="modal-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="••••••••"
              className="block w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full rounded-lg bg-[#002366] px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1565C0] disabled:bg-gray-300 disabled:text-gray-500"
            style={{ minHeight: '48px' }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-[11px] uppercase tracking-wide text-gray-400">ou</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <GoogleButton />

        <p className="mt-4 text-center text-sm text-gray-600">
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-semibold text-[#002366] hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
