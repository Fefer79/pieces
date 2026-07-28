/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Chip } from '@/components/ui/chip'
import { ArbitrageTable } from '@/components/logistique/arbitrage-table'
import { CERTAINTY_CHIP, STATUS_LABELS, STATUS_CHIP, type FleetQuoteRow } from './_shared'
import type { ArbitrageResult } from 'shared/constants'

const fmt = (n: number) => n.toLocaleString('fr-FR')

export default function SuiviPage() {
  const params = useParams<{ reference: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('t')
  const [quote, setQuote] = useState<FleetQuoteRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Lien de suivi invalide : il manque le jeton. Vérifiez l\'URL reçue par e-mail ou WhatsApp.')
      return
    }
    let cancelled = false
    fetch(`/api/v1/logistics/quote-requests/${params.reference}/public?t=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setError('Cotation introuvable ou lien expiré.')
          return
        }
        const body = await res.json()
        setQuote(body.data as FleetQuoteRow)
      })
      .catch(() => {
        if (!cancelled) setError('Connexion impossible.')
      })
    return () => {
      cancelled = true
    }
  }, [params.reference, token])

  if (error) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 py-12 lg:py-20">
        <div className="rounded-md border border-error-fg/30 bg-error-bg/40 p-6 text-[14px] text-error-fg">
          {error}
        </div>
        <Link
          href="/logistique/devis"
          className="mt-4 inline-block text-[13.5px] text-ink-2 hover:underline"
        >
          Soumettre une nouvelle demande →
        </Link>
      </section>
    )
  }

  if (!quote) {
    return <div className="mx-auto w-full max-w-2xl px-4 py-12 text-sm text-muted">Chargement…</div>
  }

  const estimate = quote.estimateJson as ArbitrageResult | null

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8 lg:py-12">
      <div className="rounded-md border border-border bg-card p-6 lg:p-7">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          Référence
        </div>
        <h1 className="mt-1 font-mono text-2xl font-semibold text-ink">{quote.reference}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip variant={STATUS_CHIP[quote.status]}>
            {STATUS_LABELS[quote.status] ?? quote.status}
          </Chip>
          <Chip variant={CERTAINTY_CHIP[quote.certaintyLevel]}>{quote.certaintyLevel}</Chip>
          <span className="ml-auto font-mono text-[12px] text-muted-2">
            Créée le {new Date(quote.createdAt).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6">
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Pièce
          </h2>
          <p className="mt-2 text-[16px] font-semibold text-ink">{quote.partName}</p>
          {quote.oemReference && (
            <p className="mt-1 font-mono text-[12.5px] text-muted-2">OEM {quote.oemReference}</p>
          )}
          <p className="mt-3 text-[13.5px] text-muted">
            {[quote.vehicleBrand, quote.vehicleModel, quote.vehicleYear].filter(Boolean).join(' ')}
            {quote.vin && (
              <span className="ml-2 font-mono text-[11.5px] tracking-[0.08em] text-muted-2">
                · VIN {quote.vin}
              </span>
            )}
          </p>
        </div>

        {estimate && (
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Estimation
            </h2>
            <ArbitrageTable
              result={estimate}
              showPartPrice={quote.partPriceHint != null}
              totalLabel={quote.partPriceHint ? 'Coût total' : 'Sous-total'}
            />
            {quote.downtimeCostPerDay && (
              <p className="mt-3 text-[12.5px] text-muted">
                Immobilisation retenue :{' '}
                <span className="tabular font-mono text-ink">
                  {fmt(quote.downtimeCostPerDay)} F
                </span>{' '}
                par jour.
              </p>
            )}
          </div>
        )}

        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Prochaines étapes
          </h2>
          <p className="text-[13.5px] leading-relaxed text-muted">
            Notre équipe vérifie le poids réel de la pièce et vous adresse les options fermes par
            WhatsApp, généralement sous deux heures ouvrées. Vous choisissez une ligne — rien
            n&apos;est engagé avant votre accord.
          </p>
        </div>
      </div>
    </section>
  )
}
