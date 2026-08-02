/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  enterpriseFetch,
  getActiveEnterpriseId,
} from '@/lib/enterprise-api'
import { Chip } from '@/components/ui/chip'
import { ArbitrageTable } from '@/components/logistique/arbitrage-table'
import {
  STATUS_LABELS,
  STATUS_CHIP,
  CERTAINTY_CHIP,
  TRANSPORT_STAGES_PUBLIC,
  type FleetQuoteRow,
} from '../_shared'
import type { ArbitrageResult } from 'shared/constants'

const fmt = (n: number) => n.toLocaleString('fr-FR')

export default function FleetQuoteDetailPage() {
  const params = useParams<{ id: string }>()
  const [quote, setQuote] = useState<FleetQuoteRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)

  useEffect(() => {
    setEnterpriseId(getActiveEnterpriseId())
  }, [])

  useEffect(() => {
    if (!enterpriseId) return
    let cancelled = false
    enterpriseFetch<FleetQuoteRow>(
      `/${enterpriseId}/logistics/quote-requests/${params.id}`,
    ).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (!res.ok) {
        setError(res.message)
        return
      }
      setQuote(res.data)
    })
    return () => {
      cancelled = true
    }
  }, [enterpriseId, params.id])

  if (loading) return <div className="p-6 text-sm text-muted">Chargement…</div>
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>
  if (!quote) return <div className="p-6 text-sm text-muted">Cotation introuvable.</div>

  const estimate = quote.estimateJson as ArbitrageResult | null

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Link
            href="/enterprise/logistics/quotes"
            className="text-[13px] text-ink-2 hover:underline"
          >
            ← Mes cotations
          </Link>
          <div className="mt-2 font-mono text-[12px] text-muted-2">{quote.reference}</div>
          <h1 className="mt-1 font-display text-3xl text-ink">{quote.partName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Chip variant={STATUS_CHIP[quote.status]}>{STATUS_LABELS[quote.status] ?? quote.status}</Chip>
            <Chip variant={CERTAINTY_CHIP[quote.certaintyLevel]}>{quote.certaintyLevel}</Chip>
            {quote.vehicleImmobilized && (
              <Chip variant="status-warn">Véhicule immobilisé</Chip>
            )}
          </div>
        </div>
        {quote.partRequestId && (
          <Link
            href={`/enterprise/requests/${quote.partRequestId}`}
            className="rounded-md border border-border-strong bg-card px-4 py-2 text-[13.5px] font-semibold text-ink hover:bg-surface"
          >
            Voir la demande de pièce
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Section title="Matrice d'arbitrage">
            {estimate ? (
              <ArbitrageTable
                result={estimate}
                showPartPrice={quote.partPriceHint != null}
                totalLabel={quote.partPriceHint ? 'Coût total' : 'Sous-total'}
              />
            ) : (
              <p className="text-sm text-muted">Matrice indisponible.</p>
            )}
          </Section>

          {quote.photos.length > 0 && (
            <Section title={`Photos (${quote.photos.length})`}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {quote.photos.map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.thumbUrl ?? p.url}
                      alt={p.kind}
                      className="h-32 w-full rounded-md border border-border object-cover"
                    />
                    <span className="mt-1 block text-[11px] uppercase tracking-[0.08em] text-muted-2">
                      {p.kind}
                    </span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          <Section title="Suivi de transport">
            <ol className="space-y-3">
              {TRANSPORT_STAGES_PUBLIC.map((stage) => {
                const matched = quote.events.find((e) => e.toStatus === stage.key)
                return (
                  <li
                    key={stage.key}
                    className={`flex items-start gap-3 rounded-md border p-3 ${
                      matched ? 'border-success-fg/30 bg-success-bg/30' : 'border-border bg-card'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                        matched ? 'bg-success-fg text-white' : 'bg-surface text-muted'
                      }`}
                    >
                      {matched ? '✓' : '·'}
                    </span>
                    <div>
                      <p className="text-[13.5px] font-semibold text-ink">{stage.label}</p>
                      <p className="text-[12.5px] text-muted">{stage.body}</p>
                      {matched && (
                        <p className="mt-0.5 font-mono text-[10.5px] text-muted-2">
                          {new Date(matched.createdAt).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Section title="Véhicule">
            <dl className="space-y-2 text-[13px]">
              <Row label="Marque / modèle" value={[quote.vehicleBrand, quote.vehicleModel].filter(Boolean).join(' ') || '—'} />
              <Row label="Année" value={quote.vehicleYear ? String(quote.vehicleYear) : '—'} />
              <Row label="VIN" value={quote.vin ?? '—'} mono />
              <Row label="Référence OEM" value={quote.oemReference ?? '—'} mono />
              <Row
                label="Coût d'immobilisation"
                value={quote.downtimeCostPerDay ? `${fmt(quote.downtimeCostPerDay)} F/j` : '—'}
              />
            </dl>
          </Section>

          <Section title="Contact">
            <dl className="space-y-2 text-[13px]">
              <Row label="Nom" value={quote.contactName} />
              <Row label="Téléphone" value={quote.phone} mono />
              {quote.whatsapp && <Row label="WhatsApp" value={quote.whatsapp} mono />}
              {quote.email && <Row label="Email" value={quote.email} />}
              {quote.commune && <Row label="Commune" value={quote.commune} />}
              {quote.companyName && <Row label="Société" value={quote.companyName} />}
            </dl>
          </Section>

          <Section title="Journal">
            {quote.events.length === 0 ? (
              <p className="text-[12.5px] text-muted">Aucun événement enregistré.</p>
            ) : (
              <ol className="space-y-2">
                {quote.events.map((e) => (
                  <li key={e.id} className="border-l-2 border-border pl-3 text-[12.5px]">
                    <div className="font-mono text-muted-2">
                      {new Date(e.createdAt).toLocaleString('fr-FR')}
                    </div>
                    {e.toStatus && (
                      <div className="font-medium text-ink">
                        {e.fromStatus ? `${STATUS_LABELS[e.fromStatus] ?? e.fromStatus} → ` : ''}
                        {STATUS_LABELS[e.toStatus] ?? e.toStatus}
                      </div>
                    )}
                    {e.note && <p className="text-muted">{e.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Section>
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

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className={mono ? 'font-mono text-ink' : 'text-ink'}>{value}</dd>
    </div>
  )
}
