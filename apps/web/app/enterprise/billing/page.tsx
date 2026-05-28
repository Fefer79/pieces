'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { enterpriseFetch, getActiveEnterpriseId } from '@/lib/enterprise-api'

type Tier = 'FREE' | 'PRO_FLOTTE' | 'PRO_FLOTTE_PLUS'
type Status = 'TRIALING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'

interface BillingData {
  subscription: {
    id: string
    tier: Tier
    status: Status
    billingCycle: 'MONTHLY' | 'ANNUAL'
    trialEndsAt: string | null
    startedAt: string
    cancelledAt: string | null
    notes: string | null
    trialExpired: boolean
  } | null
  pricing: {
    tier: Tier
    vehicleCount: number
    pricePerVehicle: number
    monthlyTotal: number
    annualTotal: number
  }
}

const TIER_LABEL: Record<Tier, string> = {
  FREE: 'Gratuit',
  PRO_FLOTTE: 'Flotte Pro',
  PRO_FLOTTE_PLUS: 'Flotte Pro +',
}

const TIER_TAGLINE: Record<Tier, string> = {
  FREE: 'Marketplace et confiance intermédiée.',
  PRO_FLOTTE: 'Pilotage, automatisation, facturation normalisée.',
  PRO_FLOTTE_PLUS: 'Tout Flotte Pro + couche urgence (SLA, 3h chrono).',
}

const STATUS_LABEL: Record<Status, string> = {
  TRIALING: 'Essai en cours',
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  CANCELLED: 'Annulé',
}

const STATUS_COLOR: Record<Status, string> = {
  TRIALING: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
}

function fmtFcfa(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`
}

export default function EnterpriseBillingPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    const id = getActiveEnterpriseId()
    if (!id) {
      setError('Aucune entreprise active. Créez ou sélectionnez une entreprise.')
      return
    }
    setEnterpriseId(id)
    enterpriseFetch<BillingData>(`/${id}/subscription`)
      .then((res) => {
        if (res.ok) setData(res.data)
        else setError(res.message)
      })
      .catch((e) => setError((e as Error).message))
  }, [])

  if (error) {
    return (
      <div className="p-6">
        <h1 className="mb-3 font-display text-2xl text-ink">Abonnement</h1>
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      </div>
    )
  }

  if (!data) return <div className="p-6 text-sm text-muted">Chargement…</div>

  const tier = data.pricing.tier
  const sub = data.subscription
  const daysLeft =
    sub?.trialEndsAt && !sub.trialExpired
      ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - now) / 86_400_000))
      : null

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="font-display text-3xl text-ink">Abonnement</h1>
      <p className="mt-1 text-sm text-muted">
        Vue d&apos;ensemble de votre formule et de votre facturation. Pour toute modification, contactez Pièces.
      </p>

      {/* Current tier card */}
      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Niveau actuel</div>
            <div className="mt-1 font-display text-3xl text-ink">{TIER_LABEL[tier]}</div>
            <div className="mt-1 text-sm text-muted">{TIER_TAGLINE[tier]}</div>
          </div>
          {sub && (
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[sub.status]}`}>
              {STATUS_LABEL[sub.status]}
            </span>
          )}
        </div>

        {sub?.status === 'TRIALING' && !sub.trialExpired && daysLeft !== null && (
          <div className="mt-5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <strong>Essai gratuit</strong> — il vous reste <strong>{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong>.
            Toutes les fonctionnalités sont activées sans engagement.
          </div>
        )}

        {sub?.trialExpired && (
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Votre essai gratuit est terminé. Vous êtes basculé sur le niveau Gratuit. Contactez Pièces pour activer votre abonnement.
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Véhicules dans la flotte" value={String(data.pricing.vehicleCount)} />
          <Stat label="Prix par véhicule / mois" value={tier === 'FREE' ? '—' : fmtFcfa(data.pricing.pricePerVehicle)} />
          <Stat label="Total mensuel" value={tier === 'FREE' ? '0 F' : fmtFcfa(data.pricing.monthlyTotal)} />
          <Stat label="Total annuel (2 mois offerts)" value={tier === 'FREE' ? '0 F' : fmtFcfa(data.pricing.annualTotal)} />
        </div>

        {sub && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted lg:grid-cols-3">
            <div>Démarré le : {sub.startedAt.slice(0, 10)}</div>
            <div>Cycle : {sub.billingCycle === 'MONTHLY' ? 'Mensuel' : 'Annuel (2 mois offerts)'}</div>
            {sub.trialEndsAt && <div>Essai expire le : {sub.trialEndsAt.slice(0, 10)}</div>}
          </div>
        )}
      </section>

      {/* Upgrade prompt */}
      {tier !== 'PRO_FLOTTE_PLUS' && (
        <section className="mt-6 rounded-xl border border-accent bg-accent/5 p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">Évoluer</div>
          <h2 className="mt-1 font-display text-2xl text-ink">
            {tier === 'FREE'
              ? 'Passez à Flotte Pro pour piloter votre flotte'
              : 'Passez à Flotte Pro + pour la couche urgence'}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {tier === 'FREE'
              ? 'Détection des véhicules « gouffres », alertes prédictives, facturation normalisée DGI, support prioritaire. 30 jours d\'essai gratuit, sans carte bancaire.'
              : 'Livraison 3 h chrono à Abidjan, J+1 garanti hors Abidjan, SLA monétisé, concierge dépannage. Tout Flotte Pro inclus.'}
          </p>
          <Link
            href="/entreprises"
            className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Voir les détails et contacter Pièces
          </Link>
        </section>
      )}

      {/* Help */}
      <section className="mt-10 border-t border-border pt-6 text-sm text-muted">
        <p>
          Phase pilote — les abonnements sont activés manuellement par l&apos;équipe Pièces. Le paiement
          récurrent par Mobile Money et virement sera disponible au prochain trimestre.
        </p>
        <p className="mt-2">
          Une question sur votre facturation ? Écrivez à{' '}
          <a href="mailto:fernando.kouame@gmail.com" className="text-accent hover:underline">
            fernando.kouame@gmail.com
          </a>
          .
        </p>
        {enterpriseId && (
          <p className="mt-3 text-xs font-mono text-muted">Réf. entreprise : {enterpriseId}</p>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-0.5 font-medium text-ink">{value}</div>
    </div>
  )
}
