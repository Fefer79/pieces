'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

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

  const inputClass =
    'block w-full rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]'
  const labelClass =
    'mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'

  if (checking) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted">Chargement…</p>
      </main>
    )
  }

  if (existingVendor) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 pt-10">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Vendeur
        </div>
        <h1 className="mb-3 mt-1 font-display text-3xl text-ink">Profil existant</h1>
        <p className="mb-6 text-sm text-muted">
          Vous avez déjà un profil vendeur : <strong className="text-ink">{existingVendor.shopName}</strong> ({existingVendor.status})
        </p>
        <Button variant="primary" size="lg" block onClick={() => router.push('/vendors/catalog')}>
          Aller à mon catalogue
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-12 pt-8 lg:pt-10">
      <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        Vendeur
      </div>
      <h1 className="mb-2 mt-1 font-display text-3xl text-ink">Créer votre profil vendeur</h1>
      <p className="mb-6 text-sm text-muted">
        Renseignez ces informations pour commencer à vendre des pièces. Formel (RCCM) ou informel (CNI) — même plateforme, pièces justificatives différentes.
      </p>

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label htmlFor="shopName" className={labelClass}>
            Nom de la boutique
          </label>
          <input
            id="shopName"
            type="text"
            value={shopName}
            onChange={(e) => { setShopName(e.target.value); setError('') }}
            placeholder="Ex : Pièces Auto Abidjan"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label htmlFor="contactName" className={labelClass}>
            Nom du contact
          </label>
          <input
            id="contactName"
            type="text"
            value={contactName}
            onChange={(e) => { setContactName(e.target.value); setError('') }}
            placeholder="Votre nom"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Téléphone
          </label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-sm border border-r-0 border-border-strong bg-surface px-3 font-mono text-sm text-muted">
              +225
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError('') }}
              placeholder="07 00 00 00 00"
              className={`${inputClass} rounded-l-none`}
              required
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Type de vendeur</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVendorType('INFORMAL')}
              className={`rounded-md border-2 p-3 text-left transition-all ${
                vendorType === 'INFORMAL'
                  ? 'border-ink-2 bg-[rgba(0,35,102,0.04)]'
                  : 'border-border bg-card hover:border-border-strong'
              }`}
            >
              <div className="text-sm font-semibold text-ink">🛠️ Particulier</div>
              <div className="mt-0.5 text-[11.5px] text-muted">Avec CNI</div>
            </button>
            <button
              type="button"
              onClick={() => setVendorType('FORMAL')}
              className={`rounded-md border-2 p-3 text-left transition-all ${
                vendorType === 'FORMAL'
                  ? 'border-ink-2 bg-[rgba(0,35,102,0.04)]'
                  : 'border-border bg-card hover:border-border-strong'
              }`}
            >
              <div className="text-sm font-semibold text-ink">🏢 Entreprise</div>
              <div className="mt-0.5 text-[11.5px] text-muted">Avec RCCM</div>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="documentNumber" className={labelClass}>
            {vendorType === 'FORMAL' ? 'Numéro RCCM' : 'Numéro CNI'}
          </label>
          <input
            id="documentNumber"
            type="text"
            value={documentNumber}
            onChange={(e) => { setDocumentNumber(e.target.value); setError('') }}
            placeholder={vendorType === 'FORMAL' ? 'Ex : CI-ABJ-2024-B-12345' : 'Ex : C001234567'}
            className={`${inputClass} font-mono`}
            required
          />
        </div>

        <div className="rounded-md border border-occasion-fg/20 bg-occasion-bg p-3.5 text-[13px] leading-relaxed text-occasion-fg">
          🛡️ En créant votre profil vendeur, vous acceptez les garanties obligatoires : retour sous 48h et garantie 30 jours sur les pièces vendues.
        </div>

        {error && (
          <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
            {error}
          </div>
        )}

        <Button type="submit" variant="accent" size="lg" block disabled={saving}>
          {saving ? 'Création en cours…' : 'Créer mon profil vendeur'}
        </Button>
      </form>
    </main>
  )
}
