'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

interface VendorProfile {
  id: string
  shopName: string
  status: string
}

export default function VendorOnboardingPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [checking, setChecking] = useState(true)
  const [existingVendor, setExistingVendor] = useState<VendorProfile | null>(null)

  // Form state
  const [shopName, setShopName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [vendorType, setVendorType] = useState<'FORMAL' | 'INFORMAL'>('INFORMAL')
  const [documentNumber, setDocumentNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function check() {
      try {
        const { data: { session } } = await getSupabase().auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        // Check if vendor already exists
        const res = await fetch('/api/v1/vendors/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const body = await res.json()
          setExistingVendor(body.data)
        }

        // Pre-fill phone from user profile
        const profileRes = await fetch('/api/v1/users/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (profileRes.ok) {
          const body = await profileRes.json()
          if (body.data.phone) {
            setPhone(body.data.phone.replace('+225', ''))
          }
          if (body.data.name) {
            setContactName(body.data.name)
          }
        }
      } catch {
        // ignore
      } finally {
        setChecking(false)
      }
    }
    check()
  }, [router])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Numéro de téléphone invalide')
      return
    }
    if (shopName.length < 2) {
      setError('Nom de boutique trop court')
      return
    }
    if (contactName.length < 2) {
      setError('Nom du contact trop court')
      return
    }
    if (documentNumber.length < 5) {
      setError(vendorType === 'FORMAL' ? 'Numéro RCCM trop court' : 'Numéro CNI trop court')
      return
    }

    setSaving(true)
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) return

      const res = await fetch('/api/v1/vendors/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopName: shopName.trim(),
          contactName: contactName.trim(),
          phone: `+225${digits}`,
          vendorType,
          kycType: vendorType === 'FORMAL' ? 'RCCM' : 'CNI',
          documentNumber: documentNumber.trim(),
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error?.message ?? "Erreur lors de la création du profil")
        return
      }

      // Vendor created, now sign guarantees to activate
      await fetch('/api/v1/vendors/me/signature', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      router.push('/vendors/catalog')
    } catch {
      setError('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </main>
    )
  }

  if (existingVendor) {
    return (
      <main className="mx-auto w-full max-w-sm px-4 pt-8 lg:max-w-lg">
        <h1 className="mb-2 text-xl font-bold text-gray-900">Profil vendeur existant</h1>
        <p className="mb-6 text-sm text-gray-600">
          Vous avez déjà un profil vendeur : <strong>{existingVendor.shopName}</strong> ({existingVendor.status})
        </p>
        <button
          onClick={() => router.push('/vendors/catalog')}
          className="w-full rounded-lg bg-[#002366] px-4 py-3 text-sm font-medium text-white"
        >
          Aller à mon catalogue
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-sm px-4 pt-8 lg:max-w-lg">
      <h1 className="mb-2 text-xl font-bold text-gray-900">Créer votre profil vendeur</h1>
      <p className="mb-6 text-sm text-gray-600">
        Renseignez ces informations pour commencer à vendre des pièces.
      </p>

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label htmlFor="shopName" className="mb-1 block text-sm font-medium text-gray-700">
            Nom de la boutique
          </label>
          <input
            id="shopName"
            type="text"
            value={shopName}
            onChange={(e) => { setShopName(e.target.value); setError('') }}
            placeholder="Ex : Pièces Auto Abidjan"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
            required
          />
        </div>

        <div>
          <label htmlFor="contactName" className="mb-1 block text-sm font-medium text-gray-700">
            Nom du contact
          </label>
          <input
            id="contactName"
            type="text"
            value={contactName}
            onChange={(e) => { setContactName(e.target.value); setError('') }}
            placeholder="Votre nom"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
            Téléphone
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
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError('') }}
              placeholder="07 00 00 00 00"
              className="block w-full rounded-r-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Type de vendeur</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVendorType('INFORMAL')}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium ${
                vendorType === 'INFORMAL'
                  ? 'border-[#002366] bg-blue-50 text-[#002366]'
                  : 'border-gray-300 text-gray-600'
              }`}
            >
              Particulier (CNI)
            </button>
            <button
              type="button"
              onClick={() => setVendorType('FORMAL')}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium ${
                vendorType === 'FORMAL'
                  ? 'border-[#002366] bg-blue-50 text-[#002366]'
                  : 'border-gray-300 text-gray-600'
              }`}
            >
              Entreprise (RCCM)
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="documentNumber" className="mb-1 block text-sm font-medium text-gray-700">
            {vendorType === 'FORMAL' ? 'Numéro RCCM' : 'Numéro CNI'}
          </label>
          <input
            id="documentNumber"
            type="text"
            value={documentNumber}
            onChange={(e) => { setDocumentNumber(e.target.value); setError('') }}
            placeholder={vendorType === 'FORMAL' ? 'Ex : CI-ABJ-2024-B-12345' : 'Ex : C001234567'}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
            required
          />
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          En créant votre profil vendeur, vous acceptez les garanties obligatoires :
          retour sous 48h et garantie 30 jours sur les pièces vendues.
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-[#ff6b00] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#B8760D] disabled:opacity-50"
        >
          {saving ? 'Création en cours...' : 'Créer mon profil vendeur'}
        </button>
      </form>
    </main>
  )
}
