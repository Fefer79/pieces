/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  enterpriseFetch,
  getActiveEnterpriseId,
  type PartRequest,
  SOURCING_OPTIONS,
} from '@/lib/enterprise-api'
import { Price } from '@/components/ui/price'
import { LogisticsMatrixCard } from '@/components/logistics-matrix'
import { CatalogItemPicker, type PickedCatalogItem } from '@/components/catalog-item-picker'
import { useCan } from '@/components/role-gate'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  REVIEWING: 'En relecture',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
  CONVERTED: 'Convertie',
  CANCELLED: 'Annulée',
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  REVIEWING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CONVERTED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

const URGENCY_LABEL: Record<string, string> = {
  LOW: 'Basse',
  NORMAL: 'Normal',
  HIGH: 'Urgent',
  CRITICAL: 'Critique',
}

export default function EnterpriseRequestDetailPage() {
  const router = useRouter()
  const params = useParams<{ requestId: string }>()
  const requestId = params.requestId
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [request, setRequest] = useState<PartRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [catalogItem, setCatalogItem] = useState<PickedCatalogItem | null>(null)
  const [selectedSource, setSelectedSource] = useState<'LOCAL' | 'AIR' | 'CARGO' | null>(null)
  const [converting, setConverting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const canApprove = useCan('approve')

  useEffect(() => { setEnterpriseId(getActiveEnterpriseId()) }, [])

  const load = useCallback(async () => {
    if (!enterpriseId) return
    setLoading(true)
    const res = await enterpriseFetch<PartRequest>(`/${enterpriseId}/part-requests/${requestId}`)
    setLoading(false)
    if (!res.ok) { setError(res.message); return }
    setRequest(res.data)
  }, [enterpriseId, requestId])

  useEffect(() => { load() }, [load])

  async function doAction(action: 'submit' | 'approve' | 'reject' | 'cancel', body?: object) {
    if (!enterpriseId) return
    setActionLoading(true)
    const res = await enterpriseFetch(`/${enterpriseId}/part-requests/${requestId}/${action}`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
    setActionLoading(false)
    if (!res.ok) { setError(res.message); return }
    setRejectReason('')
    load()
  }

  async function convert() {
    if (!enterpriseId || !request || !selectedSource || !catalogItem) return
    setConverting(true)
    const res = await enterpriseFetch(`/${enterpriseId}/part-requests/${requestId}/convert-to-order`, {
      method: 'POST',
      body: JSON.stringify({ source: selectedSource, catalogItemId: catalogItem.id }),
    })
    setConverting(false)
    if (!res.ok) { setError(res.message); return }
    load()
  }

  if (loading) return <div className="p-6 lg:p-8 text-sm text-muted">Chargement…</div>
  if (error) return <div className="p-6 lg:p-8 text-sm text-red-600">{error}</div>
  if (!request) return <div className="p-6 lg:p-8 text-sm text-muted">Demande introuvable.</div>

  return (
    <div className="p-6 lg:p-8">
      <Link href="/enterprise/requests" className="text-sm text-muted hover:underline">← Demandes</Link>

      <div className="mt-3 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">{request.partName}</h1>
          <p className="mt-1 text-sm text-muted">
            {request.vehicle.brand} {request.vehicle.model} {request.vehicle.year}
            {request.vehicle.plate ? ` · ${request.vehicle.plate}` : ''}
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${STATUS_COLOR[request.status]}`}>
            {STATUS_LABEL[request.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="mb-4 font-display text-lg text-ink">Informations</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Row label="Catégorie" value={request.category ?? '—'} />
              <Row label="Urgence" value={URGENCY_LABEL[request.urgency]} />
              <Row label="Source préférée" value={request.preferredSource} />
              <Row label="Référence OEM" value={request.oemReference ?? '—'} />
              <Row label="VIN" value={request.vehicle.vin ?? '—'} />
              <Row label="Motorisation" value={request.vehicle.engine ?? '—'} />
              <Row label="Kilométrage" value={request.vehicle.mileage != null ? `${request.vehicle.mileage.toLocaleString('fr-FR')} km` : '—'} />
              <Row label="Budget max" value={request.maxBudget != null ? `${request.maxBudget.toLocaleString('fr-FR')} F` : '—'} />
            </dl>
            {request.description && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Description</p>
                <p className="mt-1 text-sm text-ink whitespace-pre-wrap">{request.description}</p>
              </div>
            )}
          </div>

          {enterpriseId && (
            <div className="rounded-md border border-accent/30 bg-accent/5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg text-ink">Faire importer cette pièce</h2>
                  <p className="mt-1 text-[13px] text-muted">
                    Pièce introuvable en stock ? Passez la demande en cotation d&apos;import — la
                    matrice compare aérien / maritime / local avec le coût d&apos;immobilisation du
                    véhicule.
                  </p>
                </div>
                <Link
                  href={`/enterprise/logistics/quotes/new?fromRequest=${requestId}`}
                  className="rounded-md bg-accent px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  Demander une cotation import →
                </Link>
              </div>
            </div>
          )}

          {enterpriseId && (
            <LogisticsMatrixCard enterpriseId={enterpriseId} requestId={requestId} />
          )}

          {request.photos.length > 0 && (
            <div className="rounded-md border border-border bg-card p-5">
              <h2 className="mb-4 font-display text-lg text-ink">Photos ({request.photos.length})</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {request.photos.map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt="Pièce"
                      className="h-32 w-full rounded-md object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="mb-4 font-display text-lg text-ink">Traçabilité</h2>
            <ul className="space-y-2">
              {request.events.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <span className="font-medium text-ink">
                      {e.fromStatus ? `${STATUS_LABEL[e.fromStatus]} → ` : ''}
                      {STATUS_LABEL[e.toStatus]}
                    </span>
                    {e.note && <p className="text-xs text-muted">{e.note}</p>}
                  </div>
                  <div className="text-right text-xs text-muted">
                    <p>{e.actorUser?.name ?? e.actorUser?.phone ?? 'Système'}</p>
                    <p>{new Date(e.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="mb-4 font-display text-lg text-ink">Actions</h2>
            {request.status === 'SUBMITTED' && !canApprove && (
              <p className="text-sm text-muted">
                En attente de la décision du gestionnaire ou du propriétaire.
              </p>
            )}

            {request.status === 'SUBMITTED' && canApprove && (
              <div className="space-y-2">
                <button
                  onClick={() => doAction('approve')}
                  disabled={actionLoading}
                  className="w-full rounded-md bg-ink-2 px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50"
                >
                  Approuver
                </button>
                <div className="flex gap-2">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Motif du refus"
                    className="flex-1 rounded-sm border border-border bg-white px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => doAction('reject', { reason: rejectReason })}
                    disabled={actionLoading || !rejectReason}
                    className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            )}

            {request.status === 'APPROVED' && !canApprove && (
              <p className="text-sm text-muted">
                Demande approuvée. La commande sera passée par un gestionnaire.
              </p>
            )}

            {request.status === 'APPROVED' && canApprove && (
              <div className="space-y-4">
                <p className="text-sm text-muted">
                  Choisissez l&apos;option de sourcing, puis la pièce à commander.
                </p>
                <div className="space-y-2">
                  {SOURCING_OPTIONS.map((opt) => (
                    <button
                      key={opt.source}
                      type="button"
                      onClick={() => setSelectedSource(opt.source)}
                      className={`w-full rounded-md border p-3 text-left transition-colors ${
                        selectedSource === opt.source
                          ? 'border-ink-2 bg-ink-2/5'
                          : 'border-border bg-card hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink">{opt.label}</span>
                        <span className="text-xs text-muted">{opt.delay}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">{opt.priceNote}</p>
                    </button>
                  ))}
                </div>
                <CatalogItemPicker
                  value={catalogItem}
                  onChange={setCatalogItem}
                  initialQuery={request.oemReference ?? request.partName}
                  label="Pièce à commander"
                  required
                />
                <button
                  onClick={convert}
                  disabled={converting || !selectedSource || !catalogItem}
                  className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {converting ? 'Conversion…' : 'Convertir en commande'}
                </button>
              </div>
            )}

            {request.status === 'DRAFT' && (
              <button
                onClick={() => doAction('submit')}
                disabled={actionLoading}
                className="w-full rounded-md bg-ink-2 px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50"
              >
                Soumettre au manager
              </button>
            )}

            {request.status === 'CONVERTED' && request.order && (
              <div className="text-sm text-ink">
                <p>Convertie en commande <span className="font-mono">#{request.order.id.slice(0, 8)}</span></p>
                <p className="mt-1 text-muted">Statut : {request.order.status}</p>
                <p className="mt-1 font-semibold"><Price amount={request.order.totalAmount} /></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  )
}
