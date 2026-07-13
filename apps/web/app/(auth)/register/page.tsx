'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { emailSchema, passwordSchema } from 'shared/validators'
import { GoogleButton } from '@/components/google-button'

function RegisterForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const returnTo = searchParams.get('returnTo') ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const emailResult = emailSchema.safeParse(email)
    if (!emailResult.success) {
      setError(emailResult.error.issues[0]?.message ?? 'Email invalide')
      return
    }
    const pwResult = passwordSchema.safeParse(password)
    if (!pwResult.success) {
      setError(pwResult.error.issues[0]?.message ?? 'Mot de passe invalide')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (signUpError) {
        setError(signUpError.message)
        return
      }
      // If email confirmation is required, session is null and the user must
      // click the link we just emailed. If already confirmed (config off), a
      // session exists — the callback/onboarding flow takes over on next load.
      if (data.session) {
        window.location.href = '/browse'
        return
      }
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = email.length > 0 && password.length > 0 && confirm.length > 0

  if (sent) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
          Inscription
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Vérifiez votre email</h1>
        <p className="mt-3 text-sm text-muted">
          Nous avons envoyé un lien de confirmation à{' '}
          <span className="font-mono text-ink">{email}</span>. Cliquez dessus pour activer votre
          compte.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block font-semibold text-ink-2 hover:underline"
        >
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex items-center justify-center">
        <span className="font-display text-4xl text-ink">
          Pièces<span className="text-accent">.</span>
        </span>
      </div>
      <p className="mb-6 text-center text-sm text-muted">Créez votre compte</p>

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
          <label
            htmlFor="password"
            className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            placeholder="Au moins 8 caractères"
            className="block w-full rounded-sm border border-border-strong bg-card px-3 py-3 text-base text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
            autoComplete="new-password"
            disabled={loading}
            minLength={8}
          />
        </div>

        <div>
          <label
            htmlFor="confirm"
            className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
          >
            Confirmer le mot de passe
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              setError('')
            }}
            placeholder="••••••••"
            className="block w-full rounded-sm border border-border-strong bg-card px-3 py-3 text-base text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
            autoComplete="new-password"
            disabled={loading}
            minLength={8}
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
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Déjà un compte ?{' '}
        <Link
          href={`/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
          className="font-semibold text-ink-2 hover:underline"
        >
          Se connecter
        </Link>
      </p>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-3">
        <GoogleButton next={returnTo || undefined} label="S'inscrire avec Google" />

        <Link
          href={`/login/whatsapp${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-[#25D366] px-4 py-3 text-base font-semibold text-[#128C7E] transition-colors hover:bg-[#25D366]/10"
          style={{ minHeight: '48px' }}
        >
          S&apos;inscrire avec WhatsApp
          <span className="rounded-full bg-[#25D366]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#128C7E]">
            Gratuit
          </span>
        </Link>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center">
            <p className="text-sm text-muted">Chargement…</p>
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </main>
  )
}
