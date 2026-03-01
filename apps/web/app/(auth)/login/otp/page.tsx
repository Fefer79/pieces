'use client'

import { Suspense, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60

function OtpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') ?? ''

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
        const { error: verifyError } = await supabase.auth.verifyOtp({
          phone,
          token: code,
          type: 'sms',
        })
        if (verifyError) {
          setError(verifyError.message)
          return
        }
        router.push('/')
      } finally {
        setLoading(false)
      }
    },
    [phone, router],
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
    const { error: resendError } = await supabase.auth.signInWithOtp({ phone })
    if (resendError) {
      setError(resendError.message)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-2 text-center text-2xl font-bold text-[#1976D2]">Vérification</h1>
      <p className="mb-8 text-center text-sm text-gray-600">
        Entrez le code envoyé au {phone}
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
            className="h-12 w-12 rounded-lg border border-gray-300 text-center text-lg font-semibold focus:border-[#1976D2] focus:outline-none focus:ring-1 focus:ring-[#1976D2] disabled:bg-gray-100"
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
          className="text-sm text-[#1976D2] disabled:text-gray-400"
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
