'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ABIDJAN_COMMUNES } from 'shared/constants/communes'
import { liaisonFetch } from '@/lib/liaison-api'
import { CommissionBadge } from '@/components/CommissionBadge'
import { VendorMapPicker } from '@/components/vendor-map-picker'

interface VendorDetail {
  id: string
  shopName: string
  contactName: string
  phone: string
  vendorType: 'FORMAL' | 'INFORMAL'
  status: 'PENDING_ACTIVATION' | 'ACTIVE' | 'PAUSED'
  commune: string | null
  address: string | null
  lat: number | null
  lng: number | null
  deliveryZones: string[]
  catalogCount: number
  createdAt: string
  kyc: {
    kycType: 'RCCM' | 'CNI'
    documentNumber: string
  } | null
}

interface PartItem {
  id: string
  name: string | null
  category: string | null
  condition: string | null
  price: number | null
  commissionAmount: number | null
  commissionAcceptedAt: string | null
  status: string
  inStock: boolean
  imageThumbUrl: string | null
  createdAt: string
  createdByLiaisonId: string | null
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_ACTIVATION: 'En attente d\'activation',
  ACTIVE: 'Actif',
  PAUSED: 'Pausé',
}

function missingFields(v: VendorDetail): string[] {
  const missing: string[] = []
  if (!v.kyc) missing.push('KYC')
  if (!v.commune) missing.push('commune')
  if (v.lat == null) missing.push('GPS')
  return missing
}

export default function VendorDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [vendor, setVendor] = useState<VendorDetail | null>(null)
  const [parts, setParts] = useState<PartItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Formulaire de complétion
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [fCommune, setFCommune] = useState('')
  const [fAddress, setFAddress] = useState('')
  const [fCoords, setFCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [fDocument, setFDocument] = useState('')

  useEffect(() => {
    Promise.all([
      liaisonFetch<VendorDetail>(`/vendors/${id}`),
      liaisonFetch<PartItem[]>(`/vendors/${id}/parts`),
    ]).then(([v, p]) => {
      if (v.ok) setVendor(v.data)
      else setError(v.message)
      if (p.ok) setParts(p.data)
      setLoading(false)
    })
  }, [id])

  const openEditor = () => {
    if (!vendor) return
    setFCommune(vendor.commune ?? '')
    setFAddress(vendor.address ?? '')
    setFCoords(vendor.lat != null && vendor.lng != null ? { lat: vendor.lat, lng: vendor.lng } : null)
    setFDocument(vendor.kyc?.documentNumber ?? '')
    setSaveError(null)
    setEditing(true)
  }

  const handleComplete = async () => {
    if (!vendor) return
    setSaving(true)
    setSaveError(null)

    const payload: Record<string, unknown> = {}
    if (fCommune && fCommune !== (vendor.commune ?? '')) payload.commune = fCommune
    if (fAddress.length >= 2 && fAddress !== (vendor.address ?? '')) payload.address = fAddress
    if (fCoords && (fCoords.lat !== vendor.lat || fCoords.lng !== vendor.lng)) {
      payload.lat = fCoords.lat
      payload.lng = fCoords.lng
    }
    if (fDocument.length >= 5 && fDocument !== (vendor.kyc?.documentNumber ?? '')) {
      payload.documentNumber = fDocument
      payload.kycType = vendor.vendorType === 'FORMAL' ? 'RCCM' : 'CNI'
    }

    if (Object.keys(payload).length === 0) {
      setEditing(false)
      setSaving(false)
      return
    }

    const r = await liaisonFetch<VendorDetail>(`/vendors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!r.ok) {
      setSaveError(r.message)
      return
    }
    setVendor(r.data)
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
        <Link
          href="/liaison/vendors"
          className="mb-2 inline-block text-sm text-ink-2 hover:underline"
        >
          ← Retour
        </Link>
        <p className="rounded-md border border-border bg-card p-4 text-sm text-[#D32F2F]">
          {error ?? 'Vendeur introuvable'}
        </p>
      </div>
    )
  }

  const mapHref =
    vendor.lat != null && vendor.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${vendor.lat},${vendor.lng}`
      : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <Link
        href="/liaison/vendors"
        className="mb-2 inline-block text-sm text-ink-2 hover:underline"
      >
        ← Retour
      </Link>

      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-ink">{vendor.shopName}</h1>
          <p className="mt-1 text-sm text-muted">
            {vendor.contactName} · {vendor.phone}
          </p>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            vendor.status === 'ACTIVE'
              ? 'bg-[rgba(20,140,80,0.12)] text-[#148C50]'
              : 'bg-[rgba(255,107,0,0.12)] text-accent'
          }`}
        >
          {STATUS_LABELS[vendor.status] ?? vendor.status}
        </span>
      </header>

      {(() => {
        const missing = missingFields(vendor)
        if (missing.length === 0 || editing) return null
        return (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-accent/30 bg-[rgba(255,107,0,0.06)] p-3">
            <p className="text-sm text-ink">
              Infos à compléter : <strong>{missing.join(', ')}</strong>
            </p>
            <button
              type="button"
              onClick={openEditor}
              className="flex-shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white"
            >
              Compléter
            </button>
          </div>
        )
      })()}

      {editing && (
        <section className="mb-4 rounded-md border border-accent/40 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base text-ink">Compléter les informations</h2>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm text-muted hover:underline"
            >
              Annuler
            </button>
          </div>

          {saveError && (
            <p className="mb-3 rounded-md border border-[#D32F2F]/40 bg-[#D32F2F]/5 p-2.5 text-sm text-[#D32F2F]">
              {saveError}
            </p>
          )}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Commune</span>
              <select
                value={fCommune}
                onChange={(e) => setFCommune(e.target.value)}
                className="vinput"
              >
                <option value="">Sélectionner…</option>
                {ABIDJAN_COMMUNES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Adresse</span>
              <input
                value={fAddress}
                onChange={(e) => setFAddress(e.target.value)}
                className="vinput"
                placeholder="Quartier, rue, repère"
              />
            </label>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Position GPS</span>
              <VendorMapPicker
                lat={fCoords?.lat ?? null}
                lng={fCoords?.lng ?? null}
                onChange={setFCoords}
              />
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                {vendor.vendorType === 'FORMAL' ? 'Numéro RCCM' : 'Numéro CNI / résident'}
              </span>
              <input
                value={fDocument}
                onChange={(e) => setFDocument(e.target.value)}
                className="vinput"
                placeholder="Numéro du document"
              />
            </label>

            <button
              type="button"
              onClick={handleComplete}
              disabled={saving}
              className="w-full rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ minHeight: 44 }}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>

          <style jsx>{`
            :global(.vinput) {
              width: 100%;
              padding: 0.65rem 0.75rem;
              border-radius: 6px;
              border: 1px solid var(--border, #e5e5e5);
              background: var(--card, #fff);
              color: var(--ink, #1a1a1a);
              font-size: 14px;
              min-height: 44px;
            }
          `}</style>
        </section>
      )}

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
          Localisation
        </h2>
        <p className="mt-2 text-sm text-ink">
          {vendor.commune ?? '—'}
          {vendor.address ? ` · ${vendor.address}` : ''}
        </p>
        {mapHref ? (
          <a
            href={mapHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-ink-2 hover:underline"
          >
            GPS · {vendor.lat?.toFixed(5)}, {vendor.lng?.toFixed(5)} (ouvrir dans Maps)
          </a>
        ) : (
          <p className="mt-2 text-sm text-muted-2">GPS non renseigné</p>
        )}
        {vendor.deliveryZones.length > 0 && (
          <div className="mt-3">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
              Zones de livraison
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {vendor.deliveryZones.map((z) => (
                <span
                  key={z}
                  className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted"
                >
                  {z}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-md border border-border bg-card p-4">
        <h2 className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
          KYC
        </h2>
        <p className="mt-2 text-sm text-ink">
          {vendor.vendorType === 'FORMAL' ? 'Formel' : 'Informel'}
          {vendor.kyc
            ? ` · ${vendor.kyc.kycType} ${vendor.kyc.documentNumber}`
            : ''}
        </p>
      </section>

      <section className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">
          Pièces ({parts.length})
        </h2>
        <Link
          href={`/liaison/vendors/${id}/parts/new`}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
          style={{ minHeight: 40 }}
        >
          + Ajouter
        </Link>
      </section>

      {parts.length === 0 ? (
        <div className="mt-3 rounded-md border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted">Aucune pièce pour ce vendeur.</p>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-md border border-border bg-card">
          {parts.map((p) => (
            <li key={p.id} className="flex gap-3 px-3 py-3">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-sm bg-surface">
                {p.imageThumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageThumbUrl}
                    alt={p.name ?? ''}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-2">
                    —
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {p.name ?? 'Pièce'}
                </p>
                <p className="text-xs text-muted">
                  {p.category ?? '—'} · {p.condition ?? '—'} · {p.status}
                  {p.commissionAmount != null && ` · com. ${p.commissionAmount.toLocaleString('fr-FR')} F`}
                </p>
              </div>
              <div className="flex flex-col items-end justify-center gap-1">
                {p.price != null && (
                  <p className="text-sm font-medium text-ink">
                    {p.price.toLocaleString('fr-FR')} F
                  </p>
                )}
                <CommissionBadge acceptedAt={p.commissionAcceptedAt} />
                <Link
                  href={`/liaison/vendors/${id}/parts/${p.id}/edit`}
                  className="text-xs font-medium text-ink-2 hover:underline"
                >
                  Modifier
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
