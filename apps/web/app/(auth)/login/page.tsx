'use client'

import { Suspense, useState } from 'react'
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
        <span className="font-[family-name:Gloock,serif] text-4xl text-[#00113a]">
          Pièces<span className="text-[#ff6b00]">.</span>
        </span>
      </div>
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-sm text-gray-600">
          Connectez-vous avec votre numéro de téléphone ou email
        </p>

        {/* Toggle phone / email */}
        <div className="mb-4 flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => switchMethod('phone')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              method === 'phone'
                ? 'bg-white text-[#00113a] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Téléphone
          </button>
          <button
            type="button"
            onClick={() => switchMethod('email')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              method === 'email'
                ? 'bg-white text-[#00113a] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Email
          </button>
        </div>

        {/* Toggle OTP / password */}
        <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => switchAuthMode('otp')}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              authMode === 'otp'
                ? 'bg-white text-[#00113a] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Code par SMS/email
          </button>
          <button
            type="button"
            onClick={() => switchAuthMode('password')}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              authMode === 'password'
                ? 'bg-white text-[#00113a] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mot de passe
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {method === 'phone' ? (
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
                Numéro de téléphone
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-600">
                  +225
                </span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="07 00 00 00 00"
                  className="block w-full rounded-r-lg border border-gray-300 px-3 py-3 text-base focus:border-[#ff6b00] focus:outline-none focus:ring-1 focus:ring-[#ff6b00]"
                  autoComplete="tel"
                  disabled={loading}
                />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="exemple@mail.com"
                className="block w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-[#ff6b00] focus:outline-none focus:ring-1 focus:ring-[#ff6b00]"
                autoComplete="email"
                disabled={loading}
              />
            </div>
          )}

          {authMode === 'password' && (
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                className="block w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-[#ff6b00] focus:outline-none focus:ring-1 focus:ring-[#ff6b00]"
                autoComplete="current-password"
                disabled={loading}
                minLength={6}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full rounded-[14px] bg-[#ff6b00] px-4 py-3 text-base font-bold text-white transition-colors hover:bg-[#B8760D] disabled:bg-gray-300 disabled:text-gray-500"
            style={{ minHeight: '48px' }}
          >
            {loading
              ? (authMode === 'password' ? 'Connexion...' : 'Envoi en cours...')
              : (authMode === 'password' ? 'Se connecter' : 'Recevoir le code')}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center"><p className="text-gray-500">Chargement...</p></div>}>
      <LoginForm />
    </Suspense>
  )
}
