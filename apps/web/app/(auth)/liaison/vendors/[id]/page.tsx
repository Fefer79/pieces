'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { liaisonFetch } from '@/lib/liaison-api'

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

export default function VendorDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [vendor, setVendor] = useState<VendorDetail | null>(null)
  const [parts, setParts] = useState<PartItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
                </p>
              </div>
              {p.price != null && (
                <p className="self-center text-sm font-medium text-ink">
                  {p.price.toLocaleString('fr-FR')} F
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
