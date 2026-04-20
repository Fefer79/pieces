'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { emailSchema } from 'shared/validators'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const result = emailSchema.safeParse(email)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Email invalide')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (resetError) {
        setError(resetError.message)
        return
      }
      setSent(true)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
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
          Mot de passe oublié
        </h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>

        {sent ? (
          <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-800">
              ✉️ Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
              Vérifiez votre boîte mail (et vos spams).
            </p>
            <Link
              href="/login"
              className="block w-full rounded-lg bg-[#002366] px-4 py-3 text-center text-sm font-medium text-white"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="exemple@mail.com"
                className="block w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-[#ff6b00] focus:outline-none focus:ring-1 focus:ring-[#ff6b00]"
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-[14px] bg-[#ff6b00] px-4 py-3 text-base font-bold text-white transition-colors hover:bg-[#B8760D] disabled:bg-gray-300 disabled:text-gray-500"
              style={{ minHeight: '48px' }}
            >
              {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-[#002366] hover:underline"
            >
              ← Retour à la connexion
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}
