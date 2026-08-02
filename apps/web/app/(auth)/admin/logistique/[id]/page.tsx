/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { adminFetch } from '@/lib/admin-api'
import { Chip } from '@/components/ui/chip'
import { ArbitrageTable } from '@/components/logistique/arbitrage-table'
import { customerTypeLabel } from '@/lib/logistique-content'
import type { ArbitrageResult } from 'shared/constants'

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  QUOTING: 'En cotation',
  QUOTED: 'Devis envoyé',
  WON: 'Accepté',
  LOST: 'Perdu',
  SPAM: 'Spam',
}
const STATUSES = Object.keys(STATUS_LABEL)
const STATUS_CHIP = {
  NEW: 'oem',
  CONTACTED: 'oem',
  QUOTING: 'status-warn',
  QUOTED: 'status-ok',
  WON: 'status-ok',
  LOST: 'plain',
  SPAM: 'plain',
} as const

interface AdminQuoteDetail {
  id: string
  reference: string
  status: keyof typeof STATUS_LABEL
  opsNote: string | null
  lostReason: string | null
  assignedToUserId: string | null
  contactedAt: string | null
  quotedAt: string | null
  closedAt: string | null
  contactName: string
  phone: string
  whatsapp: string | null
  email: string | null
  commune: string | null
  companyName: string | null
  customerType: string
  fleetSize: number | null
  partName: string
  partCategory: string | null
  oemReference: string | null
  quantity: number
  partPriceHint: number | null
  familyId: string | null
  vin: string | null
  vinDecoded: boolean
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  energyType: string | null
  economyCategory: string | null
  vehicleImmobilized: boolean
  certaintyScore: number
  certaintyLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  downtimeCostPerDay: number | null
  estimateJson: unknown
  surface: string
  campaign: string | null
  userAgent: string | null
  createdAt: string
  photos: {
    id: string
    kind: 'PART' | 'REGISTRATION_CARD' | 'OTHER'
    position: number
    url: string
    thumbUrl: string | null
  }[]
  events: {
    id: string
    fromStatus: string | null
    toStatus: string | null
    note: string | null
    createdAt: string
  }[]
}

const fmt = (n: number) => n.toLocaleString('fr-FR')

export default function AdminLogistiqueDetailPage() {
  const params = useParams<{ id: string }>()
  const [quote, setQuote] = useState<AdminQuoteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [newStatus, setNewStatus] = useState<string>('')
  const [opsNote, setOpsNote] = useState('')
  const [lostReason, setLostReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await adminFetch<AdminQuoteDetail>(`/admin/logistics/quote-requests/${params.id}`)
    setLoading(false)
    if ('data' in res && res.data) {
      const q = res.data as unknown as AdminQuoteDetail
      setQuote(q)
      setNewStatus(q.status)
      setOpsNote(q.opsNote ?? '')
      setLostReason(q.lostReason ?? '')
    } else {
      setError(String((res as { message?: string }).message ?? 'Erreur'))
    }
  }, [params.id])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!quote) return
    setSaving(true)
    const body: Record<string, unknown> = {}
    if (newStatus !== quote.status) body.status = newStatus
    if (opsNote !== (quote.opsNote ?? '')) body.opsNote = opsNote
    if (lostReason !== (quote.lostReason ?? '')) body.lostReason = lostReason
    if (Object.keys(body).length === 0) {
      setSaving(false)
      return
    }
    await adminFetch(`/admin/logistics/quote-requests/${quote.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    void load()
  }

  if (loading) return <div className="p-8 text-sm text-muted">Chargement…</div>
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>
  if (!quote) return null

  const estimate = quote.estimateJson as ArbitrageResult | null

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/admin/logistique" className="text-[13px] text-ink-2 hover:underline">
          ← Cotations logistique
        </Link>
          <div className="mt-2 flex items-baseline gap-3">
          <h1 className="font-mono text-2xl font-semibold text-ink">{quote.reference}</h1>
          <Chip variant={STATUS_CHIP[quote.status as keyof typeof STATUS_CHIP] ?? 'plain'}>
            {STATUS_LABEL[quote.status] ?? quote.status}
          </Chip>
        </div>
        <p className="mt-1 text-sm text-muted">{quote.partName}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          {estimate && (
            <Section title="Matrice d'arbitrage (recalculée serveur)">
              <ArbitrageTable
                result={estimate}
                showPartPrice={quote.partPriceHint != null}
                totalLabel={quote.partPriceHint ? 'Coût total' : 'Sous-total'}
              />
            </Section>
          )}

          {quote.photos.length > 0 && (
            <Section title={`Photos (${quote.photos.length})`}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {quote.photos.map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.thumbUrl ?? p.url}
                      alt={p.kind}
                      className="h-40 w-full rounded-md border border-border object-cover"
                    />
                    <span className="mt-1 block text-[11px] uppercase tracking-[0.08em] text-muted-2">
                      {p.kind}
                    </span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          <Section title="Traçabilité">
            {quote.events.length === 0 ? (
              <p className="text-sm text-muted">Aucun événement.</p>
            ) : (
              <ol className="space-y-2">
                {quote.events.map((e) => (
                  <li key={e.id} className="border-l-2 border-border pl-3 text-[13px]">
                    <div className="font-mono text-muted-2">
                      {new Date(e.createdAt).toLocaleString('fr-FR')}
                    </div>
                    {e.toStatus && (
                      <div>
                        {e.fromStatus ? `${STATUS_LABEL[e.fromStatus] ?? e.fromStatus} → ` : ''}
                        {STATUS_LABEL[e.toStatus] ?? e.toStatus}
                      </div>
                    )}
                    {e.note && <p className="text-muted">{e.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Section title="Action ops">
            <div className="space-y-3">
              <Field label="Statut">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-md border border-border-strong bg-card px-3 py-2 text-sm text-ink"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Note interne">
                <textarea
                  value={opsNote}
                  onChange={(e) => setOpsNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border-strong bg-card px-3 py-2 text-sm text-ink"
                />
              </Field>
              {newStatus === 'LOST' && (
                <Field label="Raison de la perte">
                  <input
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)}
                    className="w-full rounded-md border border-border-strong bg-card px-3 py-2 text-sm text-ink"
                  />
                </Field>
              )}
              <button
                onClick={save}
                disabled={saving}
                className="w-full rounded-md bg-ink-2 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-ink disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <a
                href={`https://wa.me/${quote.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-md bg-[#25D366] px-4 py-2.5 text-center text-[14px] font-semibold text-white"
              >
                Contacter via WhatsApp
              </a>
            </div>
          </Section>

          <Section title="Contact">
            <dl className="space-y-1.5 text-[13px]">
              <Row label="Nom" value={quote.contactName} />
              <Row label="Téléphone" value={quote.phone} mono />
              {quote.whatsapp && <Row label="WhatsApp" value={quote.whatsapp} mono />}
              {quote.email && <Row label="Email" value={quote.email} />}
              {quote.companyName && <Row label="Société" value={quote.companyName} />}
              {quote.commune && <Row label="Commune" value={quote.commune} />}
              <Row label="Type" value={customerTypeLabel(quote.customerType)} />
              {quote.fleetSize != null && <Row label="Flotte" value={String(quote.fleetSize)} />}
            </dl>
          </Section>

          <Section title="Pièce & véhicule">
            <dl className="space-y-1.5 text-[13px]">
              <Row label="Pièce" value={quote.partName} />
              {quote.oemReference && <Row label="OEM" value={quote.oemReference} mono />}
              <Row label="Qté" value={String(quote.quantity)} />
              {quote.vehicleBrand && <Row label="Marque" value={quote.vehicleBrand} />}
              {quote.vehicleModel && <Row label="Modèle" value={quote.vehicleModel} />}
              {quote.vehicleYear && <Row label="Année" value={String(quote.vehicleYear)} />}
              {quote.energyType && <Row label="Énergie" value={quote.energyType} />}
              {quote.vin && <Row label="VIN" value={quote.vin} mono />}
              {quote.economyCategory && <Row label="Catégorie" value={quote.economyCategory} />}
              {quote.downtimeCostPerDay && (
                <Row label="Immobilisation" value={`${fmt(quote.downtimeCostPerDay)} F/j`} mono />
              )}
              <Row label="Identification" value={quote.certaintyLevel} />
              <Row label="Surface" value={quote.surface} />
              {quote.campaign && <Row label="Campagne" value={quote.campaign} />}
            </dl>
          </Section>

          {quote.contactedAt && (
            <Section title="Horodatage">
              <dl className="space-y-1.5 text-[12.5px] text-muted">
                {quote.contactedAt && (
                  <Row label="Contacté le" value={new Date(quote.contactedAt).toLocaleString('fr-FR')} />
                )}
                {quote.quotedAt && (
                  <Row label="Devis envoyé le" value={new Date(quote.quotedAt).toLocaleString('fr-FR')} />
                )}
                {quote.closedAt && (
                  <Row label="Fermé le" value={new Date(quote.closedAt).toLocaleString('fr-FR')} />
                )}
              </dl>
            </Section>
          )}
        </aside>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className={mono ? 'font-mono text-ink' : 'text-ink'}>{value}</dd>
    </div>
  )
}
