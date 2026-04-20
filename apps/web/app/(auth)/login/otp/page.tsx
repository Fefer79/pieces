'use client'

import { Suspense, useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const PHONE_OTP_LENGTH = 6
const EMAIL_OTP_LENGTH = 8
const RESEND_COOLDOWN = 60

function OtpForm() {
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') ?? ''
  const email = searchParams.get('email') ?? ''
  const isEmail = !!email
  const OTP_LENGTH = isEmail ? EMAIL_OTP_LENGTH : PHONE_OTP_LENGTH

  const [otp, setOtp] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const submitOtp = useCallback(
    async (code: string) => {
      setError('')
      setLoading(true)
      try {
        const supabase = createClient()
        const verifyPayload = isEmail
          ? { email, token: code, type: 'email' as const }
          : { phone, token: code, type: 'sms' as const }
        const { data, error: verifyError } = await supabase.auth.verifyOtp(verifyPayload)
        if (verifyError) {
          setError(verifyError.message)
          return
        }

        // Check if user needs to pick a role (new user with no activeContext)
        try {
          const profileRes = await fetch('/api/v1/users/me', {
            headers: { Authorization: `Bearer ${data.session?.access_token}` },
          })
          if (profileRes.ok) {
            const body = await profileRes.json()
            if (!body.data.activeContext) {
              window.location.href = '/onboarding/role'
              return
            }
          }
        } catch {
          // If profile check fails, continue with default redirect
        }

        const returnTo = sessionStorage.getItem('auth_return_to') || '/browse'
        sessionStorage.removeItem('auth_return_to')
        window.location.href = returnTo
      } finally {
        setLoading(false)
      }
    },
    [phone, email, isEmail],
  )

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    setError('')

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    const code = newOtp.join('')
    if (code.length === OTP_LENGTH) {
      submitOtp(code)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return

    const newOtp = Array.from({ length: OTP_LENGTH }, () => '')
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i] ?? ''
    }
    setOtp(newOtp)

    if (pasted.length === OTP_LENGTH) {
      submitOtp(pasted)
    } else {
      inputRefs.current[pasted.length]?.focus()
    }
  }

  async function handleResend() {
    setError('')
    setCountdown(RESEND_COOLDOWN)
    const supabase = createClient()
    const resendPayload = isEmail ? { email } : { phone }
    const { error: resendError } = await supabase.auth.signInWithOtp(resendPayload)
    if (resendError) {
      setError(resendError.message)
    }
  }

  const destination = isEmail ? email : phone

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
          Vérification
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Code envoyé</h1>
        <p className="mt-2 text-sm text-muted">
          Entrez le code reçu {isEmail ? 'à ' : 'au '}
          <span className="font-mono text-ink">{destination}</span>
        </p>
      </div>

      <div className="mb-4 flex justify-center gap-2" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={loading}
            className={`aspect-square w-12 rounded-sm border-2 bg-card text-center font-mono text-xl font-semibold text-ink outline-none transition-all disabled:bg-surface ${
              digit
                ? 'border-ink-2 bg-[rgba(0,35,102,0.04)]'
                : 'border-border-strong hover:border-ink focus:border-accent focus:shadow-[0_0_0_3px_rgba(255,107,0,0.15)]'
            }`}
            aria-label={`Chiffre ${index + 1}`}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-center text-sm text-error-fg">
          {error}
        </div>
      )}

      {loading && (
        <p className="mb-4 text-center text-sm text-muted">Vérification en cours…</p>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0}
          className="font-mono text-xs tabular text-ink-2 hover:underline disabled:text-muted-2 disabled:no-underline"
        >
          {countdown > 0 ? `Renvoyer le code dans ${countdown}s` : 'Renvoyer le code'}
        </button>
      </div>
    </div>
  )
}

export default function OtpPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <Suspense fallback={<p className="text-sm text-muted">Chargement…</p>}>
        <OtpForm />
      </Suspense>
    </main>
  )
}
