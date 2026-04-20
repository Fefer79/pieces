'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { session } } = await getSupabase().auth.getSession()
      setHasSession(!!session)
      setChecking(false)
    }
    check()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    try {
      const { error: pwError } = await getSupabase().auth.updateUser({ password })
      if (pwError) {
        setError(pwError.message)
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/browse'), 2000)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </main>
    )
  }

  if (!hasSession) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-4 gap-4">
        <p className="text-sm text-red-600">
          Lien expiré ou invalide. Veuillez recommencer la procédure.
        </p>
        <a href="/forgot-password" className="rounded-lg bg-[#002366] px-4 py-2 text-sm text-white">
          Demander un nouveau lien
        </a>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 gap-6">
      <div className="flex items-center justify-center">
        <span className="font-display text-4xl text-ink">
          Pièces<span className="text-accent">.</span>
        </span>
      </div>
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-xl font-bold text-[#00113a]">
          Nouveau mot de passe
        </h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Choisissez un nouveau mot de passe pour votre compte
        </p>

        {success ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
            <p className="text-sm text-green-800">
              ✅ Mot de passe modifié ! Redirection en cours...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                Nouveau mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="Au moins 6 caractères"
                minLength={6}
                autoComplete="new-password"
                className="block w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-[#ff6b00] focus:outline-none focus:ring-1 focus:ring-[#ff6b00]"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError('') }}
                placeholder="Confirmer"
                minLength={6}
                autoComplete="new-password"
                className="block w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-[#ff6b00] focus:outline-none focus:ring-1 focus:ring-[#ff6b00]"
                disabled={loading}
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full rounded-[14px] bg-[#ff6b00] px-4 py-3 text-base font-bold text-white transition-colors hover:bg-[#B8760D] disabled:bg-gray-300 disabled:text-gray-500"
              style={{ minHeight: '48px' }}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
