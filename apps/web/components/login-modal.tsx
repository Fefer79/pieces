'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { phoneSchema } from 'shared/validators'

type SupabaseClient = ReturnType<typeof createClient>

interface LoginModalProps {
  open: boolean
  onClose: () => void
  onAuthenticated: () => void
}

const OTP_LENGTH = 6

export function LoginModal({ open, onClose, onAuthenticated }: LoginModalProps) {
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const fullPhone = `+225${phone}`

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('phone')
      setPhone('')
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''))
      setError('')
      setLoading(false)
    }
  }, [open])

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    setPhone(digits)
    setError('')
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const result = phoneSchema.safeParse(fullPhone)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Numero invalide')
      return
    }

    setLoading(true)
    try {
      const supabase = getSupabase()

      // Dev mode: bypass OTP with password login
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_PASSWORD) {
        const { error: pwError } = await supabase.auth.signInWithPassword({
          phone: fullPhone,
          password: process.env.NEXT_PUBLIC_DEV_PASSWORD,
        })
        if (pwError) {
          setError(pwError.message)
          return
        }
        onAuthenticated()
        return
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: fullPhone })
      if (otpError) {
        setError(otpError.message)
        return
      }
      setStep('otp')
    } finally {
      setLoading(false)
    }
  }

  const submitOtp = useCallback(
    async (code: string) => {
      setError('')
      setLoading(true)
      try {
        const supabase = getSupabase()
        const { error: verifyError } = await supabase.auth.verifyOtp({
          phone: fullPhone,
          token: code,
          type: 'sms',
        })
        if (verifyError) {
          setError(verifyError.message)
          return
        }
        onAuthenticated()
      } finally {
        setLoading(false)
      }
    },
    [fullPhone, onAuthenticated],
  )

  function handleOtpChange(index: number, value: string) {
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

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 'phone' ? 'Connexion' : 'Verification'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fermer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
              Connectez-vous pour continuer
            </p>
            <div>
              <label htmlFor="modal-phone" className="mb-1 block text-sm font-medium text-gray-700">
                Numero de telephone
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-600">
                  +225
                </span>
                <input
                  id="modal-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="07 00 00 00 00"
                  className="block w-full rounded-r-lg border border-gray-300 px-3 py-3 text-base focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
                  autoComplete="tel"
                  disabled={loading}
                />
              </div>
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="w-full rounded-lg bg-[#002366] px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1565C0] disabled:bg-gray-300 disabled:text-gray-500"
              style={{ minHeight: '48px' }}
            >
              {loading ? 'Envoi en cours...' : 'Recevoir le code'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Entrez le code envoye au {fullPhone}
            </p>
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
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
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  disabled={loading}
                  className="h-12 w-12 rounded-lg border border-gray-300 text-center text-lg font-semibold focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366] disabled:bg-gray-100"
                  aria-label={`Chiffre ${index + 1}`}
                />
              ))}
            </div>
            {error && <p className="text-center text-sm text-red-600">{error}</p>}
            {loading && (
              <p className="text-center text-sm text-gray-500">Verification en cours...</p>
            )}
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setOtp(Array.from({ length: OTP_LENGTH }, () => ''))
                setError('')
              }}
              className="w-full text-center text-sm text-[#002366]"
            >
              Changer de numero
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
