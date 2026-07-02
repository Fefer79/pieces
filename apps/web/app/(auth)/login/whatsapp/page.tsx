'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { phoneSchema } from 'shared/validators'
import { setPiecesSession } from '@/lib/pieces-session'

type Step = 'phone' | 'waiting'

interface StartResult {
  code: string
  businessNumber: string | null
  waLink: string | null
  expiresInSec: number
}

function WhatsAppLoginForm() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState<StartResult | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fullPhone = `+225${phone}`

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const redirectAfterLogin = useCallback(async (accessToken: string) => {
    let target = searchParams.get('returnTo') || sessionStorage.getItem('auth_return_to') || '/browse'
    try {
      const res = await fetch('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const body = await res.json()
        if (!body.data?.activeContext) target = '/onboarding/role'
      }
    } catch {
      // ignore — fall through to default target
    }
    sessionStorage.removeItem('auth_return_to')
    window.location.href = target
  }, [searchParams])

  // Poll for verification once a code has been issued.
  useEffect(() => {
    if (step !== 'waiting' || !started) return

    async function poll() {
      try {
        const res = await fetch(`/api/v1/auth/whatsapp/status?code=${encodeURIComponent(started!.code)}`)
        if (!res.ok) return
        const body = await res.json()
        const status = body.data?.status as 'pending' | 'verified' | 'expired'

        if (status === 'verified' && body.data.accessToken) {
          stopPolling()
          setPiecesSession(body.data.accessToken)
          await redirectAfterLogin(body.data.accessToken)
        } else if (status === 'expired') {
          stopPolling()
          setError('Le code a expiré. Veuillez recommencer.')
          setStep('phone')
        }
      } catch {
        // network hiccup — keep polling
      }
    }

    pollRef.current = setInterval(poll, 3000)
    return stopPolling
  }, [step, started, stopPolling, redirectAfterLogin])

  function handlePhoneChange(value: string) {
    setPhone(value.replace(/\D/g, '').slice(0, 10))
    setError('')
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const result = phoneSchema.safeParse(fullPhone)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Numéro invalide')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/whatsapp/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error?.message ?? 'Une erreur est survenue. Réessayez.')
        return
      }
      const body = await res.json()
      setStarted(body.data as StartResult)
      setStep('waiting')
    } catch {
      setError('Impossible de contacter le serveur. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const isPhoneValid = phone.length >= 10

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 gap-6">
      <div className="flex items-center justify-center">
        <span className="font-display text-4xl text-ink">
          Pièces<span className="text-accent">.</span>
        </span>
      </div>

      <div className="w-full max-w-sm">
        {step === 'phone' && (
          <>
            <p className="mb-6 text-center text-sm text-muted">
              Connectez-vous gratuitement via WhatsApp
            </p>
            <form onSubmit={handleStart} className="space-y-4">
              <div>
                <label
                  htmlFor="wa-phone"
                  className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
                >
                  Numéro de téléphone
                </label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-sm border border-r-0 border-border-strong bg-surface px-3 font-mono text-sm text-muted">
                    +225
                  </span>
                  <input
                    id="wa-phone"
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

              {error && (
                <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isPhoneValid}
                className="w-full rounded-md bg-accent px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                style={{ minHeight: '48px' }}
              >
                {loading ? 'Un instant…' : 'Continuer avec WhatsApp'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm">
              <Link href="/login" className="text-ink-2 hover:underline">
                Autres méthodes de connexion
              </Link>
            </p>
          </>
        )}

        {step === 'waiting' && started && (
          <div className="space-y-5 text-center">
            <p className="text-sm text-muted">
              Envoyez ce code sur WhatsApp <span className="text-ink">depuis le numéro {fullPhone}</span> pour vous connecter :
            </p>

            <div className="rounded-md border border-border-strong bg-surface py-4">
              <span className="font-mono text-3xl font-semibold tracking-[0.2em] text-ink">
                {started.code}
              </span>
            </div>

            {started.waLink ? (
              <a
                href={started.waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] px-4 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
                style={{ minHeight: '48px' }}
              >
                Ouvrir WhatsApp
              </a>
            ) : (
              <p className="text-sm text-muted">
                Configuration WhatsApp indisponible. Réessayez plus tard.
              </p>
            )}

            {started.businessNumber && (
              <p className="text-xs text-muted">
                Ou envoyez manuellement <span className="font-mono text-ink">{started.code}</span> au{' '}
                <span className="font-mono text-ink">+{started.businessNumber}</span> sur WhatsApp.
              </p>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-muted">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
              En attente de votre message…
            </div>

            {error && (
              <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => { stopPolling(); setStarted(null); setStep('phone') }}
              className="text-sm text-ink-2 hover:underline"
            >
              Recommencer
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function WhatsAppLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-sm text-muted">Chargement…</p>
        </div>
      }
    >
      <WhatsAppLoginForm />
    </Suspense>
  )
}
