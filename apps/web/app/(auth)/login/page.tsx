'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { phoneSchema } from 'shared/validators'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
      setError(result.error.issues[0]?.message ?? 'Numero invalide')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()

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
        const returnTo = searchParams.get('returnTo') || sessionStorage.getItem('auth_return_to') || '/browse'
        sessionStorage.removeItem('auth_return_to')
        router.push(returnTo)
        return
      }

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
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 gap-6">
      <div className="flex items-center justify-center">
        <span className="font-[family-name:Gloock,serif] text-4xl text-[#1A1714]">
          Pièces<span className="text-[#D4880F]">.</span>
        </span>
      </div>
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-sm text-gray-600">
          Connectez-vous avec votre numero de telephone
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
              Numero de telephone
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
                className="block w-full rounded-r-lg border border-gray-300 px-3 py-3 text-base focus:border-[#D4880F] focus:outline-none focus:ring-1 focus:ring-[#D4880F]"
                autoComplete="tel"
                disabled={loading}
              />
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || phone.length < 10}
            className="w-full rounded-[14px] bg-[#D4880F] px-4 py-3 text-base font-bold text-white transition-colors hover:bg-[#B8760D] disabled:bg-gray-300 disabled:text-gray-500"
            style={{ minHeight: '48px' }}
          >
            {loading ? 'Envoi en cours...' : 'Recevoir le code'}
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
