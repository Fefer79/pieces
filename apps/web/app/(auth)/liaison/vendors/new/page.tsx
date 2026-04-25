'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ABIDJAN_COMMUNES } from 'shared/constants/communes'
import { liaisonFetch } from '@/lib/liaison-api'
import { VendorMapPicker } from '@/components/vendor-map-picker'

const VENDOR_TYPES = [
  { value: 'FORMAL', label: 'Formel (commerce enregistré)', kycLabel: 'Numéro RCCM' },
  { value: 'INFORMAL', label: 'Informel (marché)', kycLabel: 'Numéro CNI / résident' },
] as const
type VendorType = (typeof VENDOR_TYPES)[number]['value']

const PHONE_REGEX = /^\+225(01|05|07)\d{8}$/

export default function NewVendorPage() {
  const router = useRouter()

  const [shopName, setShopName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('+225')
  const [vendorType, setVendorType] = useState<VendorType>('INFORMAL')
  const [documentNumber, setDocumentNumber] = useState('')
  const [commune, setCommune] = useState<string>('')
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [deliveryZones, setDeliveryZones] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const kycType = vendorType === 'FORMAL' ? 'RCCM' : 'CNI'
  const kycLabel = VENDOR_TYPES.find((t) => t.value === vendorType)?.kycLabel ?? ''

  const valid =
    shopName.length >= 2 &&
    contactName.length >= 2 &&
    PHONE_REGEX.test(phone) &&
    documentNumber.length >= 5 &&
    commune.length > 0 &&
    address.length >= 2 &&
    coords != null

  const toggleZone = (z: string) => {
    setDeliveryZones((prev) =>
      prev.includes(z) ? prev.filter((p) => p !== z) : [...prev, z],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || !coords) return
    setSubmitting(true)
    setError(null)

    const r = await liaisonFetch<{ id: string }>('/vendors', {
      method: 'POST',
      body: JSON.stringify({
        shopName,
        contactName,
        phone,
        vendorType,
        documentNumber,
        kycType,
        commune,
        address,
        lat: coords.lat,
        lng: coords.lng,
        deliveryZones,
      }),
    })

    setSubmitting(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    router.push(`/liaison/vendors/${r.data.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6">
      <Link
        href="/liaison/vendors"
        className="mb-2 inline-block text-sm text-ink-2 hover:underline"
      >
        ← Retour
      </Link>
      <h1 className="mb-1 font-display text-2xl text-ink">Onboarder un vendeur</h1>
      <p className="mb-6 text-sm text-muted">
        Saisissez les informations du vendeur, sa localisation et ses pièces.
      </p>

      {error && (
        <p className="mb-4 rounded-md border border-[#D32F2F]/40 bg-[#D32F2F]/5 p-3 text-sm text-[#D32F2F]">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Nom de la boutique" required>
          <input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="input"
            placeholder="Ex : Auto Pièces Yopougon"
          />
        </Field>

        <Field label="Nom du contact" required>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="input"
            placeholder="Prénom Nom"
          />
        </Field>

        <Field label="Téléphone" required hint="Format : +225 0X 00 00 00 00">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input"
            placeholder="+2250700000000"
          />
        </Field>

        <Field label="Type de vendeur" required>
          <div className="grid grid-cols-2 gap-2">
            {VENDOR_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setVendorType(t.value)}
                className={`rounded-md px-3 py-3 text-left text-sm transition-colors ${
                  vendorType === t.value
                    ? 'bg-ink-2 text-white'
                    : 'bg-card text-ink ring-1 ring-border'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label={kycLabel} required>
          <input
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Commune" required>
          <select
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            className="input"
          >
            <option value="">Sélectionner…</option>
            {ABIDJAN_COMMUNES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Adresse" required hint="Quartier, rue, repère">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input"
            placeholder="Ex : Carrefour Siporex, près de la pharmacie"
          />
        </Field>

        <Field label="Position GPS" required hint="Cliquez sur la carte ou utilisez votre position">
          <VendorMapPicker
            lat={coords?.lat ?? null}
            lng={coords?.lng ?? null}
            onChange={setCoords}
          />
        </Field>

        <Field label="Zones de livraison" hint="Communes desservies par le vendeur">
          <div className="flex flex-wrap gap-2">
            {ABIDJAN_COMMUNES.map((z) => {
              const active = deliveryZones.includes(z)
              return (
                <button
                  key={z}
                  type="button"
                  onClick={() => toggleZone(z)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-ink-2 text-white'
                      : 'bg-card text-muted ring-1 ring-border'
                  }`}
                >
                  {z}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/liaison/vendors"
            className="rounded-md bg-card px-4 py-2.5 text-sm font-medium text-muted ring-1 ring-border"
            style={{ minHeight: 44 }}
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={!valid || submitting}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ minHeight: 44 }}
          >
            {submitting ? 'Création…' : 'Créer le vendeur'}
          </button>
        </div>
      </form>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.65rem 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--border, #e5e5e5);
          background: var(--card, #fff);
          color: var(--ink, #1a1a1a);
          font-size: 14px;
          min-height: 44px;
        }
        :global(.input:focus) {
          outline: 2px solid rgba(0, 35, 102, 0.4);
          outline-offset: 1px;
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink">
        {label}
        {required && <span className="text-accent">*</span>}
      </span>
      {hint && <span className="mb-1.5 block text-xs text-muted">{hint}</span>}
      {children}
    </label>
  )
}
