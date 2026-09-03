'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ABIDJAN_COMMUNES } from 'shared/constants/communes'
import { liaisonFetch, liaisonUpload } from '@/lib/liaison-api'
import { prospectionFetch } from '@/lib/prospection-api'
import { compressImage } from '@/lib/logistique/compress-image'
import { VendorMapPicker } from '@/components/vendor-map-picker'

const VENDOR_TYPES = [
  {
    value: 'FORMAL',
    label: 'Formel (commerce enregistré)',
    kycLabel: 'Numéro RCCM',
    photoLabel: 'Photo du RCCM',
  },
  {
    value: 'INFORMAL',
    label: 'Informel (marché)',
    kycLabel: 'Numéro CNI / résident',
    photoLabel: 'Photo de la CNI ou d’une pièce d’identité valide',
  },
] as const
type VendorType = (typeof VENDOR_TYPES)[number]['value']

const PHONE_REGEX = /^\+225(01|05|07)\d{8}$/

export default function NewVendorPage() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm text-muted">Chargement…</p>}>
      <NewVendorForm />
    </Suspense>
  )
}

function NewVendorForm() {
  const router = useRouter()
  // Préremplissage depuis un entretien de démarchage qui vient d'être clôturé.
  const searchParams = useSearchParams()
  const interviewId = searchParams.get('interviewId')

  const [shopName, setShopName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('+225')
  const [vendorType, setVendorType] = useState<VendorType>('INFORMAL')
  const [documentNumber, setDocumentNumber] = useState('')
  const [commune, setCommune] = useState<string>('')
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [deliveryZones, setDeliveryZones] = useState<string[]>([])
  const [idPhoto, setIdPhoto] = useState<File | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const kycType = vendorType === 'FORMAL' ? 'RCCM' : 'CNI'
  const kycLabel = VENDOR_TYPES.find((t) => t.value === vendorType)?.kycLabel ?? ''
  const photoLabel = VENDOR_TYPES.find((t) => t.value === vendorType)?.photoLabel ?? ''

  const idPhotoPreview = useMemo(
    () => (idPhoto ? URL.createObjectURL(idPhoto) : null),
    [idPhoto],
  )
  useEffect(
    () => () => {
      if (idPhotoPreview) URL.revokeObjectURL(idPhotoPreview)
    },
    [idPhotoPreview],
  )

  // Le préremplissage ne s'applique qu'au montage : on ne réécrit jamais une
  // saisie en cours.
  useEffect(() => {
    const prefill = {
      shopName: searchParams.get('shopName'),
      contactName: searchParams.get('contactName'),
      phone: searchParams.get('phone'),
      commune: searchParams.get('commune'),
    }
    if (prefill.shopName) setShopName(prefill.shopName)
    if (prefill.contactName) setContactName(prefill.contactName)
    if (prefill.phone) setPhone(prefill.phone.startsWith('+') ? prefill.phone : `+225${prefill.phone}`)
    if (prefill.commune && (ABIDJAN_COMMUNES as readonly string[]).includes(prefill.commune)) {
      setCommune(prefill.commune)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Onboarding minimal : nom de la boutique + téléphone suffisent. Le reste
  // (contact, KYC, localisation, zones) se complète plus tard depuis la fiche.
  const valid = shopName.length >= 2 && PHONE_REGEX.test(phone)

  const toggleZone = (z: string) => {
    setDeliveryZones((prev) =>
      prev.includes(z) ? prev.filter((p) => p !== z) : [...prev, z],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    setError(null)

    // On n'envoie que les champs renseignés ; le backend tolère un onboarding minimal.
    const payload: Record<string, unknown> = {
      shopName,
      phone,
      vendorType,
      deliveryZones,
    }
    if (contactName.length >= 2) payload.contactName = contactName
    if (documentNumber.length >= 5) {
      payload.documentNumber = documentNumber
      payload.kycType = kycType
    }
    if (commune.length > 0) payload.commune = commune
    if (address.length >= 2) payload.address = address
    if (coords) {
      payload.lat = coords.lat
      payload.lng = coords.lng
    }

    const r = await liaisonFetch<{ id: string }>('/vendors', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (!r.ok) {
      setSubmitting(false)
      setError(r.message)
      return
    }

    const vendorId = r.data.id

    // La photo ne peut partir qu'après la création : elle est rattachée au
    // vendeur. Un échec d'upload ne perd pas le vendeur créé.
    if (idPhoto) {
      const form = new FormData()
      form.append('document', await compressImage(idPhoto), 'piece-identite.jpg')
      const up = await liaisonUpload(`/vendors/${vendorId}/kyc-photo`, form)
      if (!up.ok) {
        setSubmitting(false)
        setError(
          `Vendeur créé, mais la pièce d'identité n'a pas pu être envoyée : ${up.message}. Reprenez la photo depuis sa fiche.`,
        )
        return
      }
    }

    // Rattachement à l'entretien d'où vient cet onboarding.
    if (interviewId) {
      await prospectionFetch(`/interviews/${interviewId}`, {
        method: 'PATCH',
        body: JSON.stringify({ vendorId }),
      })
    }

    setSubmitting(false)
    router.push(`/liaison/vendors/${vendorId}`)
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
      <p className="mb-4 text-sm text-muted">
        Le nom de la boutique et le téléphone suffisent pour démarrer. Le reste
        (KYC, localisation, zones de livraison) se complète plus tard.
      </p>

      <p className="mb-6 rounded-md border border-border bg-card p-3 text-xs text-muted">
        Le vendeur sera créé en <strong>activation en attente</strong>. Vous pourrez
        compléter ses informations depuis sa fiche à tout moment.
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

        <Field label="Nom du contact" hint="Optionnel — par défaut, le nom de la boutique">
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

        <Field label="Type de vendeur">
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

        <Field label={kycLabel} hint="Optionnel — à compléter lors de l'activation">
          <input
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            className="input"
          />
        </Field>

        <Field
          label={photoLabel}
          hint="Photographiez le document — c'est la pièce qui fait foi, le numéro peut être relevé plus tard"
        >
          {idPhotoPreview ? (
            <figure className="relative overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={idPhotoPreview}
                alt="Pièce d'identité du vendeur"
                className="aspect-[4/3] w-full bg-surface object-contain"
              />
              <button
                type="button"
                onClick={() => setIdPhoto(null)}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink backdrop-blur"
                aria-label="Retirer la photo"
              >
                ×
              </button>
            </figure>
          ) : (
            <label
              className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-strong text-sm text-muted transition-colors hover:bg-surface"
              style={{ minHeight: 44 }}
            >
              <span className="text-2xl leading-none text-muted-2">＋</span>
              Prendre la photo
              <input
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="hidden"
                onChange={(e) => setIdPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </Field>

        <Field label="Commune" hint="Optionnel">
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

        <Field label="Adresse" hint="Optionnel — quartier, rue, repère">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input"
            placeholder="Ex : Carrefour Siporex, près de la pharmacie"
          />
        </Field>

        <Field label="Position GPS" hint="Optionnel — cliquez sur la carte ou utilisez votre position">
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
