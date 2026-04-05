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
        // Debug: check cookies after verifyOtp
        const cookies = document.cookie
        const sbCookies = cookies.split(';').map(c => c.trim()).filter(c => c.startsWith('sb-'))
        const debugInfo = `cookies(${sbCookies.length}): ${sbCookies.map(c => c.split('=')[0]).join(', ') || 'NONE'}`
        setError(`DEBUG: ${debugInfo}`)
        return
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
    <div className="w-full max-w-sm">
      <h1 className="mb-2 text-center text-2xl font-bold text-[#002366]">Vérification</h1>
      <p className="mb-8 text-center text-sm text-gray-600">
        Entrez le code envoyé {isEmail ? 'à ' : 'au '}{destination}
      </p>

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
            className="h-12 w-12 rounded-lg border border-gray-300 text-center text-lg font-semibold focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366] disabled:bg-gray-100"
            aria-label={`Chiffre ${index + 1}`}
          />
        ))}
      </div>

      {error && <p className="mb-4 text-center text-sm text-red-600">{error}</p>}

      {loading && (
        <p className="mb-4 text-center text-sm text-gray-500">Vérification en cours...</p>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0}
          className="text-sm text-[#002366] disabled:text-gray-400"
        >
          {countdown > 0 ? `Renvoyer le code (${countdown}s)` : 'Renvoyer le code'}
        </button>
      </div>
    </div>
  )
}

export default function OtpPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <Suspense fallback={<p className="text-gray-500">Chargement...</p>}>
        <OtpForm />
      </Suspense>
    </main>
  )
}
