'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { adminFetch, fmtFcfa } from '@/lib/admin-api'

type Tier = 'FREE' | 'PRO_FLOTTE' | 'PRO_FLOTTE_PLUS'
type Status = 'TRIALING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'
type Cycle = 'MONTHLY' | 'ANNUAL'

interface SubscriptionEvent {
  id: string
  kind: string
  payload: unknown
  actorUserId: string | null
  createdAt: string
}

interface Subscription {
  id: string
  tier: Tier
  status: Status
  billingCycle: Cycle
  trialEndsAt: string | null
  startedAt: string
  cancelledAt: string | null
  notes: string | null
  createdAt: string
  events?: SubscriptionEvent[]
}

interface CurrentResponse {
  subscription: (Subscription & { trialExpired: boolean }) | null
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

export default function AdminSubscriptionPage() {
  const params = useParams()
  const id = params.id as string

  const [current, setCurrent] = useState<CurrentResponse | null>(null)
  const [history, setHistory] = useState<Subscription[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [tier, setTier] = useState<Tier>('PRO_FLOTTE')
  const [cycle, setCycle] = useState<Cycle>('MONTHLY')
  const [startTrial, setStartTrial] = useState(true)
  const [trialDays, setTrialDays] = useState(30)
  const [notes, setNotes] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [c, h] = await Promise.all([
        adminFetch<CurrentResponse>(`/admin/enterprises/${id}/subscription`),
        adminFetch<Subscription[]>(`/admin/enterprises/${id}/subscriptions`),
      ])
      setCurrent(c)
      setHistory(h)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await adminFetch(`/admin/enterprises/${id}/subscriptions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tier,
          billingCycle: cycle,
          startTrial: tier !== 'FREE' && startTrial,
          trialDays: tier !== 'FREE' && startTrial ? trialDays : undefined,
          notes: notes.trim() || null,
        }),
      })
      setNotes('')
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function patchStatus(subId: string, status: Status) {
    setSubmitting(true)
    try {
      await adminFetch(`/admin/subscriptions/${subId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted">Chargement…</div>

  return (
    <div className="p-4 lg:p-6">
      <Link href={`/admin/enterprises/${id}`} className="mb-3 inline-block text-sm text-ink-2 hover:underline">
        ← Entreprise
      </Link>

      <h1 className="mb-1 font-display text-2xl text-ink">Abonnement entreprise</h1>
      <div className="mb-6 text-sm text-muted">
        Activation manuelle phase pilote. Pas encore de paiement automatisé.
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-status-err/30 bg-status-err/10 px-4 py-2 text-sm text-status-err">
          {error}
        </div>
      )}

      {/* Current */}
      <section className="mb-6 rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Abonnement actuel</div>

        {current?.subscription ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-xl text-ink">{TIER_LABEL[current.subscription.tier]}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[current.subscription.status]}`}>
                {STATUS_LABEL[current.subscription.status]}
              </span>
              {current.subscription.trialExpired && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  Essai expiré
                </span>
              )}
              <span className="text-xs text-muted">
                Cycle {current.subscription.billingCycle === 'MONTHLY' ? 'mensuel' : 'annuel'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
              <Stat label="Véhicules" value={String(current.pricing.vehicleCount)} />
              <Stat label="Prix / véhicule" value={fmtFcfa(current.pricing.pricePerVehicle)} />
              <Stat label="Total mensuel" value={fmtFcfa(current.pricing.monthlyTotal)} />
              <Stat label="Total annuel (2 mois offerts)" value={fmtFcfa(current.pricing.annualTotal)} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-muted lg:grid-cols-3">
              <div>Démarré le : {current.subscription.startedAt.slice(0, 10)}</div>
              {current.subscription.trialEndsAt && (
                <div>Essai expire le : {current.subscription.trialEndsAt.slice(0, 10)}</div>
              )}
              {current.subscription.cancelledAt && (
                <div>Annulé le : {current.subscription.cancelledAt.slice(0, 10)}</div>
              )}
            </div>

            {current.subscription.notes && (
              <div className="rounded-md border border-border bg-surface p-3 text-sm text-ink">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Notes</div>
                {current.subscription.notes}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {current.subscription.status === 'TRIALING' && (
                <button
                  onClick={() => patchStatus(current.subscription!.id, 'ACTIVE')}
                  disabled={submitting}
                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  Activer (sortir d&apos;essai)
                </button>
              )}
              {current.subscription.status === 'ACTIVE' && (
                <button
                  onClick={() => patchStatus(current.subscription!.id, 'SUSPENDED')}
                  disabled={submitting}
                  className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  Suspendre
                </button>
              )}
              {current.subscription.status === 'SUSPENDED' && (
                <button
                  onClick={() => patchStatus(current.subscription!.id, 'ACTIVE')}
                  disabled={submitting}
                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  Réactiver
                </button>
              )}
              {(current.subscription.status === 'ACTIVE' ||
                current.subscription.status === 'TRIALING' ||
                current.subscription.status === 'SUSPENDED') && (
                <button
                  onClick={() => {
                    if (confirm('Annuler définitivement cet abonnement ?')) {
                      patchStatus(current.subscription!.id, 'CANCELLED')
                    }
                  }}
                  disabled={submitting}
                  className="rounded-md border border-status-err/40 bg-status-err/5 px-3 py-1.5 text-xs font-semibold text-status-err hover:bg-status-err/10 disabled:opacity-50"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted">Aucun abonnement actif — entreprise sur le tier gratuit.</div>
        )}
      </section>

      {/* Create new */}
      <section className="mb-6 rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          Créer / changer d&apos;abonnement
        </div>
        <div className="mb-3 text-xs text-muted">
          La création annule automatiquement l&apos;abonnement actif précédent.
        </div>

        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Tier">
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as Tier)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="FREE">Gratuit</option>
                <option value="PRO_FLOTTE">Flotte Pro · 5 000 F/véh/mois</option>
                <option value="PRO_FLOTTE_PLUS">Flotte Pro + · 10 000 F/véh/mois</option>
              </select>
            </Field>
            <Field label="Cycle">
              <select
                value={cycle}
                onChange={(e) => setCycle(e.target.value as Cycle)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="MONTHLY">Mensuel</option>
                <option value="ANNUAL">Annuel (2 mois offerts)</option>
              </select>
            </Field>
            {tier !== 'FREE' && (
              <Field label={`Essai ${trialDays} j`}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={startTrial}
                    onChange={(e) => setStartTrial(e.target.checked)}
                  />
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={trialDays}
                    onChange={(e) => setTrialDays(Number(e.target.value) || 30)}
                    disabled={!startTrial}
                    className="w-20 rounded-md border border-border bg-card px-2 py-1.5 text-sm disabled:opacity-50"
                  />
                  <span className="text-xs text-muted">jours</span>
                </div>
              </Field>
            )}
          </div>

          <Field label="Notes (optionnel)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex. : pilote signé le 27/05, contact DG, conditions négociées…"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {submitting ? 'Création…' : 'Créer l\'abonnement'}
          </button>
        </form>
      </section>

      {/* History */}
      <section className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          Historique ({history.length})
        </div>
        {history.length === 0 ? (
          <div className="text-sm text-muted">Aucun abonnement enregistré.</div>
        ) : (
          <div className="space-y-3">
            {history.map((s) => (
              <details key={s.id} className="rounded-md border border-border bg-surface">
                <summary className="cursor-pointer list-none px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{TIER_LABEL[s.tier]}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[s.status]}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                    <span className="text-xs text-muted">
                      {s.createdAt.slice(0, 10)} · {s.billingCycle === 'MONTHLY' ? 'mensuel' : 'annuel'}
                    </span>
                  </div>
                </summary>
                <div className="border-t border-border px-3 py-2">
                  {s.notes && <div className="mb-2 text-xs text-ink">{s.notes}</div>}
                  <div className="space-y-1 text-xs text-muted">
                    {(s.events ?? []).map((ev) => (
                      <div key={ev.id} className="flex justify-between">
                        <span className="font-mono">{ev.kind}</span>
                        <span>{ev.createdAt.slice(0, 16).replace('T', ' ')}</span>
                      </div>
                    ))}
                    {(s.events ?? []).length === 0 && <div className="text-muted">Aucun événement.</div>}
                  </div>
                </div>
              </details>
            ))}
          </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</span>
      {children}
    </label>
  )
}
