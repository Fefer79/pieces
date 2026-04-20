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
        <h1 className="mb-2 text-center font-display text-2xl text-ink">
          Mot de passe oublié
        </h1>
        <p className="mb-6 text-center text-sm text-muted">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>

        {sent ? (
          <div className="space-y-4 rounded-md border border-success-fg/20 bg-success-bg p-4">
            <p className="text-sm text-success-fg">
              ✉️ Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte mail (et vos spams).
            </p>
            <Link
              href="/login"
              className="block w-full rounded-md bg-ink-2 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-ink"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
              >
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="exemple@mail.com"
                className="block w-full rounded-sm border border-border-strong bg-card px-3 py-3 text-base text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            {error && (
              <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-md bg-accent px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              style={{ minHeight: '48px' }}
            >
              {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-ink-2 hover:underline"
            >
              ← Retour à la connexion
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}
