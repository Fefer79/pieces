'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

const VENDOR_TYPES = [
  { value: 'FORMAL', label: 'Formel (commerce enregistré)', kycLabel: 'Numéro RCCM' },
  { value: 'INFORMAL', label: 'Informel (marché)', kycLabel: 'Numéro CNI / Carte de résident' },
] as const

type VendorType = (typeof VENDOR_TYPES)[number]['value']

export default function OnboardingNewPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [shopName, setShopName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('+225')
  const [vendorType, setVendorType] = useState<VendorType>('FORMAL')
  const [documentNumber, setDocumentNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const PHONE_REGEX = /^\+225(01|05|07)\d{8}$/
  const phoneError = touched.phone && !PHONE_REGEX.test(phone)
    ? 'Format invalide (ex: +2250700000000)'
    : null

  const kycType = vendorType === 'FORMAL' ? 'RCCM' : 'CNI'
  const kycLabel = VENDOR_TYPES.find((t) => t.value === vendorType)?.kycLabel ?? ''

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        return
      }

      const res = await fetch('/api/v1/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shopName,
          contactName,
          phone,
          vendorType,
          documentNumber,
          kycType,
        }),
      })

      const body = await res.json()

      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors de la création du profil vendeur')
        return
      }

      router.push('/profile')
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]'
  const labelCls = 'mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:py-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Onboarding
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Profil vendeur</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="shopName" className={labelCls}>Nom de la boutique</label>
          <input
            id="shopName"
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="contactName" className={labelCls}>Nom du contact</label>
          <input
            id="contactName"
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelCls}>Téléphone vendeur</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            required
            inputMode="tel"
            pattern="^\+225(01|05|07)\d{8}$"
            placeholder="+2250700000000"
            className={`${inputCls} font-mono ${phoneError ? 'border-error-fg focus:border-error-fg focus:shadow-[0_0_0_3px_rgba(180,35,24,0.08)]' : ''}`}
          />
          {phoneError && <p className="mt-1 text-xs text-error-fg">{phoneError}</p>}
        </div>

        <fieldset>
          <legend className={labelCls}>Type de vendeur</legend>
          <div className="space-y-2">
            {VENDOR_TYPES.map((type) => (
              <label
                key={type.value}
                className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
                  vendorType === type.value
                    ? 'border-ink-2 bg-[rgba(0,35,102,0.04)]'
                    : 'border-border bg-card hover:border-border-strong'
                }`}
              >
                <input
                  type="radio"
                  name="vendorType"
                  value={type.value}
                  checked={vendorType === type.value}
                  onChange={() => setVendorType(type.value)}
                  className="accent-[color:var(--color-ink-2)]"
                />
                <span className={`text-sm ${vendorType === type.value ? 'font-semibold text-ink' : 'text-ink'}`}>
                  {type.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="documentNumber" className={labelCls}>{kycLabel}</label>
          <input
            id="documentNumber"
            type="text"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            required
            minLength={5}
            maxLength={50}
            className={`${inputCls} font-mono`}
          />
        </div>

        {error && (
          <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Création en cours…' : 'Créer le profil vendeur'}
        </button>
      </form>
    </div>
  )
}
