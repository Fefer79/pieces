'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { phoneSchema, emailSchema } from 'shared/validators'

type LoginMethod = 'phone' | 'email'
type AuthMode = 'otp' | 'password'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [method, setMethod] = useState<LoginMethod>('phone')
  const [authMode, setAuthMode] = useState<AuthMode>('otp')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fullPhone = `+225${phone}`

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    setPhone(digits)
    setError('')
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    setError('')
  }

  function switchMethod(m: LoginMethod) {
    setMethod(m)
    setError('')
  }

  function switchAuthMode(m: AuthMode) {
    setAuthMode(m)
    setError('')
    setPassword('')
  }

  async function redirectAfterLogin(accessToken: string | undefined) {
    // Check if user has a role; if not, send to onboarding
    try {
      const profileRes = await fetch('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${accessToken ?? ''}` },
      })
      if (profileRes.ok) {
        const body = await profileRes.json()
        if (!body.data.activeContext) {
          window.location.href = '/onboarding/role'
          return
        }
      }
    } catch {
      // ignore
    }
    const returnTo = searchParams.get('returnTo') || sessionStorage.getItem('auth_return_to') || '/browse'
    sessionStorage.removeItem('auth_return_to')
    window.location.href = returnTo
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const supabase = createClient()

    // Validate identifier
    if (method === 'phone') {
      const result = phoneSchema.safeParse(fullPhone)
      if (!result.success) {
        setError(result.error.issues[0]?.message ?? 'Numéro invalide')
        return
      }
    } else {
      const result = emailSchema.safeParse(email)
      if (!result.success) {
        setError(result.error.issues[0]?.message ?? 'Email invalide')
        return
      }
    }

    setLoading(true)
    try {
      // Password mode
      if (authMode === 'password') {
        if (!password) {
          setError('Mot de passe requis')
          return
        }
        const credentials = method === 'phone'
          ? { phone: fullPhone, password }
          : { email, password }
        const { data, error: pwError } = await supabase.auth.signInWithPassword(credentials)
        if (pwError) {
          setError(pwError.message)
          return
        }
        await redirectAfterLogin(data.session?.access_token)
        return
      }

      // OTP mode
      if (method === 'phone') {
        const { error: otpError } = await supabase.auth.signInWithOtp({ phone: fullPhone })
        if (otpError) {
          setError(otpError.message)
          return
        }
        router.push(`/login/otp?phone=${encodeURIComponent(fullPhone)}`)
      } else {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (otpError) {
          setError(otpError.message)
          return
        }
        router.push(`/login/otp?email=${encodeURIComponent(email)}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const isPhoneValid = phone.length >= 10
  const isEmailValid = email.length > 0
  const canSubmit = (method === 'phone' ? isPhoneValid : isEmailValid) && (authMode === 'otp' || password.length >= 6)

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 gap-6">
      <div className="flex items-center justify-center">
        <span className="font-display text-4xl text-ink">
          Pièces<span className="text-accent">.</span>
        </span>
      </div>
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-sm text-muted">
          Connectez-vous avec votre numéro de téléphone ou email
        </p>

        {/* Toggle phone / email */}
        <div className="mb-3 flex rounded-md border border-border bg-surface p-1">
          {(['phone', 'email'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMethod(m)}
              className={`flex-1 rounded-sm py-2 text-sm font-medium transition-all ${
                method === m
                  ? 'bg-card text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {m === 'phone' ? 'Téléphone' : 'Email'}
            </button>
          ))}
        </div>

        {/* Toggle OTP / password */}
        <div className="mb-6 flex rounded-md border border-border bg-surface p-1">
          {(['otp', 'password'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => switchAuthMode(mode)}
              className={`flex-1 rounded-sm py-1.5 text-xs font-medium transition-all ${
                authMode === mode
                  ? 'bg-card text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {mode === 'otp' ? 'Code par SMS/email' : 'Mot de passe'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {method === 'phone' ? (
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
              >
                Numéro de téléphone
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-sm border border-r-0 border-border-strong bg-surface px-3 font-mono text-sm text-muted">
                  +225
                </span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="07 00 00 00 00"
                  className="block w-full rounded-r-sm border border-border-strong bg-card px-3 py-3 text-base text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
                  autoComplete="tel"
                  disabled={loading}
                />
              </div>
            </div>
          ) : (
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
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="exemple@mail.com"
                className="block w-full rounded-sm border border-border-strong bg-card px-3 py-3 text-base text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
                autoComplete="email"
                disabled={loading}
              />
            </div>
          )}

          {authMode === 'password' && (
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
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                className="block w-full rounded-sm border border-border-strong bg-card px-3 py-3 text-base text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
                autoComplete="current-password"
                disabled={loading}
                minLength={6}
              />
            </div>
          )}

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
            {loading
              ? (authMode === 'password' ? 'Connexion…' : 'Envoi en cours…')
              : (authMode === 'password' ? 'Se connecter' : 'Recevoir le code')}
          </button>
        </form>
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
