'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { emailSchema } from 'shared/validators'
import { GoogleButton } from '@/components/google-button'

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const returnTo = searchParams.get('returnTo') ?? ''

  // Le callback OAuth (app/auth/callback) renvoie ici avec ?error=… quand
  // l'échange de code échoue (ex. secret Google invalide côté Supabase →
  // « missing_token »). Sans ça, l'utilisateur revenait au menu de connexion
  // sans aucun message — la connexion « tournait » puis échouait en silence.
  const oauthError = searchParams.get('error')
  useEffect(() => {
    if (!oauthError) return
    setError(
      oauthError === 'missing_token' || oauthError === 'server_error'
        ? 'La connexion avec Google a échoué. Réessayez, ou connectez-vous avec votre email.'
        : oauthError,
    )
  }, [oauthError])

  async function redirectAfterLogin(accessToken: string | undefined) {
    // Provisionne la ligne User côté API (plus de détour par un choix de rôle
    // — tout le monde démarre dans l'espace Achat).
    try {
      await fetch('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${accessToken ?? ''}` },
      })
    } catch {
      // ignore
    }
    const dest = returnTo || sessionStorage.getItem('auth_return_to') || '/browse'
    sessionStorage.removeItem('auth_return_to')
    window.location.href = dest
  }

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
      const supabase = createClient()
      const { data, error: pwError } = await supabase.auth.signInWithPassword({ email, password })
      if (pwError) {
        setError(
          pwError.message === 'Invalid login credentials'
            ? 'Email ou mot de passe incorrect'
            : pwError.message,
        )
        return
      }
      await redirectAfterLogin(data.session?.access_token)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = email.length > 0 && password.length > 0

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 gap-6">
      <div className="flex items-center justify-center">
        <span className="font-display text-4xl text-ink">
          Pièces<span className="text-accent">.</span>
        </span>
      </div>
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-sm text-muted">
          Connectez-vous avec votre email et mot de passe
        </p>

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
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="exemple@mail.com"
              className="block w-full rounded-sm border border-border-strong bg-card px-3 py-3 text-base text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
              >
                Mot de passe
              </label>
              <Link href="/forgot-password" className="text-xs text-ink-2 hover:underline">
                Oublié ?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="••••••••"
              className="block w-full rounded-sm border border-border-strong bg-card px-3 py-3 text-base text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full rounded-md bg-accent px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            style={{ minHeight: '48px' }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <Link
          href={`/login/whatsapp${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-[#25D366] px-4 py-3 text-base font-semibold text-[#128C7E] transition-colors hover:bg-[#25D366]/10"
          style={{ minHeight: '48px' }}
        >
          Se connecter avec WhatsApp
        </Link>

        <p className="mt-4 text-center text-sm text-muted">
          Pas encore de compte ?{' '}
          <Link
            href={`/register${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
            className="font-semibold text-ink-2 hover:underline"
          >
            Créer un compte
          </Link>
        </p>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">ou</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton next={returnTo || undefined} />
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-sm text-muted">Chargement…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
