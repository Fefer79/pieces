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

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-[#1A1A1A]">Onboarding Vendeur</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="shopName" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
            Nom de la boutique
          </label>
          <input
            id="shopName"
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="contactName" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
            Nom du contact
          </label>
          <input
            id="contactName"
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
            Téléphone vendeur
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            inputMode="tel"
            placeholder="+2250700000000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-[#1A1A1A]">Type de vendeur</legend>
          <div className="space-y-2">
            {VENDOR_TYPES.map((type) => (
              <label key={type.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="vendorType"
                  value={type.value}
                  checked={vendorType === type.value}
                  onChange={() => setVendorType(type.value)}
                  className="text-[#1976D2]"
                />
                {type.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="documentNumber" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
            {kycLabel}
          </label>
          <input
            id="documentNumber"
            type="text"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            required
            minLength={5}
            maxLength={50}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
          />
        </div>

        {error && (
          <p className="text-sm text-[#D32F2F]">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#1976D2] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1565C0] disabled:opacity-50"
        >
          {loading ? 'Création en cours...' : 'Créer le profil vendeur'}
        </button>
      </form>
    </div>
  )
}
