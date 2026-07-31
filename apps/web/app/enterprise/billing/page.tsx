'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { enterpriseFetch } from '@/lib/enterprise-api'
import { useEnterprise } from '@/lib/enterprise-context'
import { useCan } from '@/components/role-gate'
import { FLEET_PLANS } from '@/lib/fleet-plans'
import {
  MOBILE_MONEY_LIST,
  MOBILE_MONEY,
  IVORIAN_PHONE_RE,
  normalizeIvorianPhone,
  type MobileMoneyOperator,
} from '@/lib/mobile-money'

type Tier = 'FREE' | 'PRO_FLOTTE' | 'PRO_FLOTTE_PLUS'
type PaidTier = Exclude<Tier, 'FREE'>
type Status = 'TRIALING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'
type Cycle = 'MONTHLY' | 'ANNUAL'
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED'

interface BillingData {
  subscription: {
    id: string
    tier: Tier
    status: Status
    billingCycle: Cycle
    trialEndsAt: string | null
    startedAt: string
    currentPeriodEnd: string | null
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

interface Quote {
  tier: PaidTier
  billingCycle: Cycle
  vehicleCount: number
  pricePerVehicle: number
  monthsBilled: number
  amount: number
  periodStart: string
  periodEnd: string
}

interface SubscriptionPayment {
  id: string
  amount: number
  tier: PaidTier
  billingCycle: Cycle
  vehicleCount: number
  operator: MobileMoneyOperator
  payerPhone: string
  status: PaymentStatus
  paymentUrl: string | null
  periodStart: string | null
  periodEnd: string | null
  paidAt: string | null
  failureReason: string | null
  createdAt: string
}

const PLAN_BY_KEY = Object.fromEntries(FLEET_PLANS.map((p) => [p.key, p])) as Record<
  Tier,
  (typeof FLEET_PLANS)[number]
>

const TIER_LABEL: Record<Tier, string> = {
  FREE: PLAN_BY_KEY.FREE.label,
  PRO_FLOTTE: PLAN_BY_KEY.PRO_FLOTTE.label,
  PRO_FLOTTE_PLUS: PLAN_BY_KEY.PRO_FLOTTE_PLUS.label,
}

const TIER_TAGLINE: Record<Tier, string> = {
  FREE: PLAN_BY_KEY.FREE.tagline,
  PRO_FLOTTE: PLAN_BY_KEY.PRO_FLOTTE.tagline,
  PRO_FLOTTE_PLUS: PLAN_BY_KEY.PRO_FLOTTE_PLUS.tagline,
}

const STATUS_LABEL: Record<Status, string> = {
  TRIALING: 'En cours',
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  CANCELLED: 'Annulé',
}

const STATUS_COLOR: Record<Status, string> = {
  TRIALING: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-success-bg text-success-fg',
  SUSPENDED: 'bg-warn-bg text-warn-fg',
  CANCELLED: 'bg-gray-100 text-gray-700',
}

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'En attente',
  PAID: 'Payé',
  FAILED: 'Échoué',
  EXPIRED: 'Expiré',
}

const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  PENDING: 'bg-warn-bg text-warn-fg',
  PAID: 'bg-success-bg text-success-fg',
  FAILED: 'bg-error-bg text-error-fg',
  EXPIRED: 'bg-gray-100 text-gray-700',
}

function fmtFcfa(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// `useSearchParams` (retour de la passerelle) impose une frontière Suspense,
// sans quoi le prérendu de la page échoue au build.
export default function EnterpriseBillingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Chargement…</div>}>
      <BillingPage />
    </Suspense>
  )
}

function BillingPage() {
  const { enterpriseId, loading: entLoading, error: entError } = useEnterprise()
  const canPay = useCan('payBilling')
  const searchParams = useSearchParams()
  const returnedPaymentId = searchParams.get('paiement')

  const [data, setData] = useState<BillingData | null>(null)
  const [payments, setPayments] = useState<SubscriptionPayment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  const load = useCallback(async () => {
    if (!enterpriseId) return
    const [sub, hist] = await Promise.all([
      enterpriseFetch<BillingData>(`/${enterpriseId}/subscription`),
      enterpriseFetch<SubscriptionPayment[]>(`/${enterpriseId}/subscription/payments`),
    ])
    if (sub.ok) setData(sub.data)
    else setError(sub.message)
    // L'historique est réservé aux rôles financiers : un refus ici n'est pas
    // une erreur de page, on masque simplement le bloc.
    if (hist.ok) setPayments(hist.data)
  }, [enterpriseId])

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial, setState dans la réponse */
    void load()
  }, [load])

  if (entError) return <PageError message={entError} />
  if (error) return <PageError message={error} />
  if (entLoading || !data) return <div className="p-6 text-sm text-muted">Chargement…</div>

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
        Votre formule, votre échéance et le règlement par mobile money.
      </p>

      {returnedPaymentId && enterpriseId && (
        <PaymentReturnBanner
          enterpriseId={enterpriseId}
          paymentId={returnedPaymentId}
          onConfirmed={load}
        />
      )}

      {/* Formule en cours */}
      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              Niveau actuel
            </div>
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
            <strong>Formule active</strong> — il vous reste{' '}
            <strong>
              {daysLeft} jour{daysLeft > 1 ? 's' : ''}
            </strong>
            . Réglez dès maintenant : le paiement prolonge à partir de la fin de cette période, aucun
            jour n&apos;est perdu.
          </div>
        )}

        {sub?.trialExpired && (
          <div className="mt-5 rounded-md border border-warn-fg/30 bg-warn-bg px-4 py-3 text-sm text-warn-fg">
            Votre formule est repassée sur le niveau Gratuit. Réglez ci-dessous pour réactiver votre
            palier.
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Véhicules dans la flotte" value={String(data.pricing.vehicleCount)} />
          <Stat
            label="Prix par véhicule / mois"
            value={tier === 'FREE' ? '—' : fmtFcfa(data.pricing.pricePerVehicle)}
          />
          <Stat
            label="Total mensuel"
            value={tier === 'FREE' ? '0 F' : fmtFcfa(data.pricing.monthlyTotal)}
          />
          <Stat
            label="Total annuel (2 mois offerts)"
            value={tier === 'FREE' ? '0 F' : fmtFcfa(data.pricing.annualTotal)}
          />
        </div>

        {sub && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted lg:grid-cols-3">
            <div>Démarré le : {sub.startedAt.slice(0, 10)}</div>
            <div>Cycle : {sub.billingCycle === 'MONTHLY' ? 'Mensuel' : 'Annuel (2 mois offerts)'}</div>
            {sub.currentPeriodEnd ? (
              <div>Réglé jusqu&apos;au : {sub.currentPeriodEnd.slice(0, 10)}</div>
            ) : (
              sub.trialEndsAt && <div>Formule en cours jusqu&apos;au : {sub.trialEndsAt.slice(0, 10)}</div>
            )}
          </div>
        )}
      </section>

      {/* Règlement */}
      {enterpriseId && canPay && (
        <PaymentForm
          enterpriseId={enterpriseId}
          currentTier={tier}
          currentCycle={sub?.billingCycle ?? 'MONTHLY'}
          vehicleCount={data.pricing.vehicleCount}
        />
      )}

      {enterpriseId && !canPay && (
        <section className="mt-6 rounded-xl border border-border bg-surface p-5 text-sm text-muted">
          Le règlement de l&apos;abonnement est réservé au propriétaire et au comptable de la flotte.
        </section>
      )}

      {payments.length > 0 && <PaymentHistory payments={payments} />}

      {/* Montée en gamme */}
      {tier !== 'PRO_FLOTTE_PLUS' && (
        <section className="mt-6 rounded-xl border border-accent bg-accent/5 p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
            Recommandé — Flotte Pro +
          </div>
          <h2 className="mt-1 font-display text-2xl text-ink">
            Passez à Flotte Pro + pour optimiser tous vos coûts d&apos;exploitation
          </h2>
          <p className="mt-2 text-sm text-muted">
            {tier === 'FREE'
              ? 'Pilotage et analytique des coûts, détection des véhicules « gouffres », alertes d\'entretien — plus la livraison express et la gestion déléguée de vos achats de pièces (en option, sans surcoût). Pour 9 900 F par véhicule / mois, soit seulement 5 000 F de plus que Flotte Pro.'
              : 'Pour 5 000 F de plus par véhicule, vous ajoutez la livraison express, le réapprovisionnement automatique, la facture mensuelle consolidée + export FEC et le support prioritaire dédié.'}
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-ink sm:grid-cols-2">
            {[
              ...PLAN_BY_KEY.PRO_FLOTTE_PLUS.highlights,
              ...PLAN_BY_KEY.PRO_FLOTTE_PLUS.delivery.map(
                (d) => `Livraison ${d.label.toLowerCase()} : ${d.value.toLowerCase()}`,
              ),
            ].map((h) => (
              <li key={h} className="flex gap-2">
                <span className="mt-0.5 text-accent">✓</span>
                <span className="leading-snug">{h}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/entreprises"
            className="mt-5 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Voir le détail des paliers
          </Link>
        </section>
      )}

      <section className="mt-10 border-t border-border pt-6 text-sm text-muted">
        <p>
          Une question sur votre facturation ? Écrivez à{' '}
          <a href="mailto:fernando.kouame@gmail.com" className="text-accent hover:underline">
            fernando.kouame@gmail.com
          </a>
          .
        </p>
        {enterpriseId && (
          <p className="mt-3 font-mono text-xs text-muted">Réf. entreprise : {enterpriseId}</p>
        )}
      </section>
    </div>
  )
}

/**
 * Formulaire de règlement : palier + cycle → devis serveur → opérateur →
 * redirection CinetPay. Le montant affiché vient toujours du serveur, jamais
 * d'un calcul local : c'est celui-là qui sera appelé au paiement.
 */
function PaymentForm({
  enterpriseId,
  currentTier,
  currentCycle,
  vehicleCount,
}: {
  enterpriseId: string
  currentTier: Tier
  currentCycle: Cycle
  vehicleCount: number
}) {
  const [tier, setTier] = useState<PaidTier>(currentTier === 'FREE' ? 'PRO_FLOTTE' : currentTier)
  const [cycle, setCycle] = useState<Cycle>(currentCycle)
  const [operator, setOperator] = useState<MobileMoneyOperator>('ORANGE_MONEY')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Le devis est mémorisé avec la combinaison qui l'a produit : changer de
  // palier périme l'ancien montant sans avoir à le remettre à zéro d'abord —
  // le prix affiché ne peut jamais appartenir à une autre sélection.
  const quoteKey = `${tier}|${cycle}`
  const [quoteState, setQuoteState] = useState<{
    key: string
    quote: Quote | null
    error: string | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    enterpriseFetch<Quote>(`/${enterpriseId}/subscription/quote?tier=${tier}&billingCycle=${cycle}`)
      .then((res) => {
        if (cancelled) return
        setQuoteState({
          key: `${tier}|${cycle}`,
          quote: res.ok ? res.data : null,
          error: res.ok ? null : res.message,
        })
      })
      .catch((e) => {
        if (!cancelled) {
          setQuoteState({ key: `${tier}|${cycle}`, quote: null, error: (e as Error).message })
        }
      })
    return () => {
      cancelled = true
    }
  }, [enterpriseId, tier, cycle])

  const fresh = quoteState?.key === quoteKey ? quoteState : null
  const quote = fresh?.quote ?? null
  const quoteError = fresh?.error ?? null

  const normalizedPhone = useMemo(() => normalizeIvorianPhone(phone), [phone])
  const phoneValid = IVORIAN_PHONE_RE.test(normalizedPhone)

  async function submit() {
    if (!quote || !phoneValid) return
    setSubmitting(true)
    setSubmitError(null)
    const res = await enterpriseFetch<{ payment: SubscriptionPayment; quote: Quote }>(
      `/${enterpriseId}/subscription/payments`,
      {
        method: 'POST',
        body: JSON.stringify({ tier, billingCycle: cycle, operator, payerPhone: normalizedPhone }),
      },
    )
    if (!res.ok) {
      setSubmitting(false)
      setSubmitError(res.message)
      return
    }
    const url = res.data.payment.paymentUrl
    if (!url) {
      setSubmitting(false)
      setSubmitError(
        `Le paiement a été enregistré mais la passerelle n'a pas renvoyé de lien. Contactez Pièces avec la référence ${res.data.payment.id}`,
      )
      return
    }
    window.location.href = url
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-6">
      <h2 className="font-display text-2xl text-ink">Régler mon abonnement</h2>
      <p className="mt-1 text-sm text-muted">
        Paiement par mobile money. Le règlement prolonge votre période en cours — vous ne perdez
        aucun jour déjà payé.
      </p>

      {/* Palier */}
      <fieldset className="mt-6">
        <legend className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          Palier
        </legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(['PRO_FLOTTE', 'PRO_FLOTTE_PLUS'] as PaidTier[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              aria-pressed={tier === t}
              className={`rounded-lg border p-4 text-left transition ${
                tier === t ? 'border-2 border-ink bg-ink/[0.04]' : 'border-border hover:border-ink/30'
              }`}
            >
              <div className="font-medium text-ink">{TIER_LABEL[t]}</div>
              <div className="mt-0.5 text-xs text-muted">{TIER_TAGLINE[t]}</div>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Périodicité */}
      <fieldset className="mt-5">
        <legend className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          Périodicité
        </legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {[
            { id: 'MONTHLY' as Cycle, label: 'Mensuel', hint: '1 mois couvert' },
            { id: 'ANNUAL' as Cycle, label: 'Annuel', hint: '12 mois couverts, 10 facturés' },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCycle(c.id)}
              aria-pressed={cycle === c.id}
              className={`rounded-lg border p-4 text-left transition ${
                cycle === c.id
                  ? 'border-2 border-ink bg-ink/[0.04]'
                  : 'border-border hover:border-ink/30'
              }`}
            >
              <div className="font-medium text-ink">{c.label}</div>
              <div className="mt-0.5 text-xs text-muted">{c.hint}</div>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Opérateur — cartes 2×2, pastille 44×44, radio à droite (DESIGN.md) */}
      <fieldset className="mt-5">
        <legend className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          Opérateur
        </legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {MOBILE_MONEY_LIST.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOperator(m.id)}
              aria-pressed={operator === m.id}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                operator === m.id
                  ? 'border-2 border-ink bg-ink/[0.04]'
                  : 'border-border hover:border-ink/30'
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${m.bg} ${m.fg}`}
              >
                {m.short}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">{m.label}</span>
                <span className="block text-xs text-muted">{m.subtitle}</span>
              </span>
              <span
                className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                  operator === m.id ? 'border-ink bg-ink' : 'border-border'
                }`}
                aria-hidden
              />
            </button>
          ))}
        </div>
      </fieldset>

      {/* Numéro payeur */}
      <div className="mt-5">
        <label
          htmlFor="payer-phone"
          className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted"
        >
          Numéro qui règle
        </label>
        <input
          id="payer-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07 07 07 07 07"
          className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
        />
        <p className="mt-1 text-xs text-muted">
          {phone && !phoneValid
            ? 'Numéro ivoirien attendu : 10 chiffres commençant par 01, 05 ou 07.'
            : `Ce numéro sera débité via ${MOBILE_MONEY[operator].label}. Il peut différer de celui du compte.`}
        </p>
      </div>

      {/* Décomposition du montant (DESIGN.md — RISK #2 : aucun frais caché) */}
      <div className="mt-6 rounded-lg border border-border bg-surface p-4">
        {quoteError ? (
          <p className="text-sm text-error-fg">{quoteError}</p>
        ) : !quote ? (
          <p className="text-sm text-muted">Calcul du montant…</p>
        ) : (
          <dl className="space-y-1.5 text-sm tabular-nums">
            <Row label="Prix par véhicule / mois" value={fmtFcfa(quote.pricePerVehicle)} />
            <Row label="Véhicules dans la flotte" value={String(vehicleCount)} />
            <Row
              label="Mois facturés"
              value={
                cycle === 'ANNUAL'
                  ? `${quote.monthsBilled} (12 couverts — 2 offerts)`
                  : String(quote.monthsBilled)
              }
            />
            <div className="!mt-3 border-t border-border pt-2">
              <Row label="Total à régler" value={fmtFcfa(quote.amount)} strong />
            </div>
            <p className="!mt-3 text-xs text-muted">
              Période couverte : du {fmtDate(quote.periodStart)} au {fmtDate(quote.periodEnd)}.
            </p>
          </dl>
        )}
      </div>

      {submitError && (
        <div className="mt-4 rounded-md border border-error-fg/30 bg-error-bg px-4 py-3 text-sm text-error-fg">
          {submitError}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!quote || !phoneValid || submitting}
        className="mt-5 w-full rounded-md bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {submitting
          ? 'Redirection vers le paiement…'
          : quote
            ? `Payer ${fmtFcfa(quote.amount)}`
            : 'Payer'}
      </button>
      <p className="mt-2 text-xs text-muted">
        Vous serez redirigé vers la page sécurisée de notre prestataire de paiement, puis ramené ici.
      </p>
    </section>
  )
}

/**
 * Retour de la passerelle. La confirmation vient du webhook, pas du navigateur :
 * on interroge le paiement jusqu'à ce que le serveur le déclare encaissé, et on
 * ne conclut jamais rien de l'URL de retour elle-même.
 */
function PaymentReturnBanner({
  enterpriseId,
  paymentId,
  onConfirmed,
}: {
  enterpriseId: string
  paymentId: string
  onConfirmed: () => void
}) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    let attempts = 0
    const MAX_ATTEMPTS = 20 // ~60 s à 3 s d'intervalle

    async function poll() {
      if (cancelled) return
      const res = await enterpriseFetch<SubscriptionPayment>(
        `/${enterpriseId}/subscription/payments/${paymentId}`,
      )
      if (cancelled) return
      if (res.ok) {
        setStatus(res.data.status)
        if (res.data.status === 'PAID') {
          onConfirmed()
          return
        }
        if (res.data.status === 'FAILED' || res.data.status === 'EXPIRED') return
      }
      attempts += 1
      if (attempts >= MAX_ATTEMPTS) {
        setTimedOut(true)
        return
      }
      timer = window.setTimeout(poll, 3000)
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [enterpriseId, paymentId, onConfirmed])

  if (status === 'PAID') {
    return (
      <div className="mt-6 rounded-md border border-success-fg/30 bg-success-bg px-4 py-3 text-sm text-success-fg">
        <strong>Paiement confirmé.</strong> Votre abonnement est actif.
      </div>
    )
  }

  if (status === 'FAILED' || status === 'EXPIRED') {
    return (
      <div className="mt-6 rounded-md border border-error-fg/30 bg-error-bg px-4 py-3 text-sm text-error-fg">
        Le paiement n&apos;a pas abouti. Aucun montant n&apos;a été encaissé — vous pouvez réessayer
        ci-dessous.
      </div>
    )
  }

  if (timedOut) {
    return (
      <div className="mt-6 rounded-md border border-warn-fg/30 bg-warn-bg px-4 py-3 text-sm text-warn-fg">
        Confirmation en attente chez l&apos;opérateur. Si le montant a été débité, votre abonnement
        s&apos;activera automatiquement à réception. Référence :{' '}
        <span className="font-mono">{paymentId}</span>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted">
      Confirmation du paiement en cours…
    </div>
  )
}

function PaymentHistory({ payments }: { payments: SubscriptionPayment[] }) {
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-6">
      <h2 className="font-display text-2xl text-ink">Historique des règlements</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              <th className="py-2 pr-3 font-normal">Date</th>
              <th className="py-2 pr-3 font-normal">Montant</th>
              <th className="py-2 pr-3 font-normal">Opérateur</th>
              <th className="py-2 pr-3 font-normal">Période</th>
              <th className="py-2 font-normal">Statut</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-3 text-muted">{p.createdAt.slice(0, 10)}</td>
                <td className="py-2 pr-3 tabular-nums text-ink">{fmtFcfa(p.amount)}</td>
                <td className="py-2 pr-3 text-ink">{MOBILE_MONEY[p.operator]?.label ?? p.operator}</td>
                <td className="py-2 pr-3 text-muted">
                  {p.periodStart && p.periodEnd
                    ? `${p.periodStart.slice(0, 10)} → ${p.periodEnd.slice(0, 10)}`
                    : '—'}
                </td>
                <td className="py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PAYMENT_STATUS_COLOR[p.status]}`}
                  >
                    {PAYMENT_STATUS_LABEL[p.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? 'font-medium text-ink' : 'text-muted'}>{label}</dt>
      <dd className={strong ? 'font-display text-lg text-ink' : 'text-ink'}>{value}</dd>
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

function PageError({ message }: { message: string }) {
  return (
    <div className="p-6">
      <h1 className="mb-3 font-display text-2xl text-ink">Abonnement</h1>
      <div className="rounded-md border border-error-fg/30 bg-error-bg px-4 py-3 text-sm text-error-fg">
        {message}
      </div>
    </div>
  )
}
