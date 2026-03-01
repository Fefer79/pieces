'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { phoneSchema } from 'shared/validators'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fullPhone = `+225${phone}`

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    setPhone(digits)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const result = phoneSchema.safeParse(fullPhone)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Numéro invalide')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: fullPhone })
      if (otpError) {
        setError(otpError.message)
        return
      }
      router.push(`/login/otp?phone=${encodeURIComponent(fullPhone)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-[#1976D2]">Pièces</h1>
        <p className="mb-8 text-center text-sm text-gray-600">
          Connectez-vous avec votre numéro de téléphone
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                className="block w-full rounded-r-lg border border-gray-300 px-3 py-3 text-base focus:border-[#1976D2] focus:outline-none focus:ring-1 focus:ring-[#1976D2]"
                autoComplete="tel"
                disabled={loading}
              />
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || phone.length < 10}
            className="w-full rounded-lg bg-[#1976D2] px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1565C0] disabled:bg-gray-300 disabled:text-gray-500"
            style={{ minHeight: '48px' }}
          >
            {loading ? 'Envoi en cours...' : 'Recevoir le code'}
          </button>
        </form>
      </div>
    </main>
  )
}
