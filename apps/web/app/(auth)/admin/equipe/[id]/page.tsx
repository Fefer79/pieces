'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  equipeFetch,
  fmtFcfa,
  type AgentCommission,
  type AgentObjectiveMetric,
  type MemberDetail,
} from '@/lib/equipe-api'
import {
  activityLabel,
  COMMISSION_STATUS_LABELS,
  commissionStatusVariant,
  currentPeriode,
  formatPeriode,
  formatShortDate,
  METRIC_LABELS,
  PROGRESS_BAR_CLASS,
  progressPct,
  progressTone,
} from '@/lib/equipe-utils'
import { StatCard } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { ProfileFormCard } from '@/components/equipe/profile-form-card'

const VENDOR_STATUS_LABELS: Record<string, string> = {
  PENDING_ACTIVATION: 'En activation',
  ACTIVE: 'Actif',
  PAUSED: 'En pause',
}

// Même arrondi aux 100 F que l'API (roundTo100).
const roundTo100 = (n: number) => Math.round(n / 100) * 100

export default function EquipeMembreDetailPage() {
  const params = useParams<{ id: string }>()
  const [member, setMember] = useState<MemberDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showProfileForm, setShowProfileForm] = useState(false)

  const load = useCallback(() => {
    equipeFetch<MemberDetail>(`/members/${params.id}`).then((res) => {
      if (res.ok) {
        setMember(res.data)
        setError(null)
      } else {
        setNotFound(true)
        setError(res.message)
      }
    })
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  if (notFound) {
    return (
      <div>
        <Link href="/admin/equipe" className="text-[13px] text-ink-2 hover:underline">
          ← Équipe
        </Link>
        <p className="mt-4 text-sm text-error-fg">{error ?? 'Membre introuvable.'}</p>
      </div>
    )
  }
  if (!member) return <div className="text-sm text-muted">Chargement…</div>

  const profil = member.teamProfile
  const tauxPct = profil?.tauxCommissionPct ?? 10
  const baseMois = member.vendeursGeres.reduce((s, v) => s + v.commissionsMoisFcfa, 0)
  const estimationMois = roundTo100((baseMois * tauxPct) / 100)
  const objectifsAtteints = member.objectifs.filter((o) => o.progression >= o.cible).length

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/equipe" className="text-[13px] text-ink-2 hover:underline">
          ← Équipe
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl text-ink">{member.name ?? '—'}</h1>
          {profil && !profil.actif ? (
            <Chip variant="plain">Inactif</Chip>
          ) : (
            <Chip variant="status-ok">Actif</Chip>
          )}
          <div className="ml-auto">
            <button
              onClick={() => setShowProfileForm((v) => !v)}
              className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card"
            >
              {showProfileForm ? 'Fermer' : 'Modifier le profil'}
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted">
          {profil?.fonction ?? 'Profil non créé'}
          {member.phone ? ` · ${member.phone}` : ''}
          {profil?.embaucheLe ? ` · embauché le ${formatShortDate(profil.embaucheLe)}` : ''}
          {` · taux ${tauxPct} %`}
        </p>
      </div>

      {showProfileForm && (
        <ProfileFormCard
          userId={member.id}
          initial={profil}
          onClose={() => setShowProfileForm(false)}
          onSaved={() => {
            setShowProfileForm(false)
            load()
          }}
        />
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Vendeurs gérés" value={member.vendeursGeres.length} />
        <StatCard
          label={`Base du mois · ${formatPeriode(currentPeriode())}`}
          value={fmtFcfa(baseMois)}
        />
        <StatCard
          label="Estimation du mois"
          value={fmtFcfa(estimationMois)}
          delta={`${tauxPct} %`}
        />
        <StatCard
          label="Objectifs du mois"
          value={`${objectifsAtteints}/${member.objectifs.length}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Section title={`Objectifs · ${formatPeriode(currentPeriode())}`}>
            {member.objectifs.length === 0 ? (
              <p className="mb-3 text-sm text-muted">Aucun objectif fixé ce mois-ci.</p>
            ) : (
              <div className="mb-4 space-y-3">
                {member.objectifs.map((o) => {
                  const pct = progressPct(o.progression, o.cible)
                  return (
                    <div key={o.id}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-ink">{METRIC_LABELS[o.metrique]}</span>
                        <span className="font-mono text-xs text-muted">
                          {o.progression}/{o.cible} · {pct} %
                        </span>
                      </div>
                      <div
                        className="relative h-2 overflow-hidden rounded-full bg-surface"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progression ${METRIC_LABELS[o.metrique]}`}
                      >
                        <div
                          className={`h-full rounded-full ${PROGRESS_BAR_CLASS[progressTone(pct)]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1 text-right">
                        <DeleteObjectiveButton id={o.id} onDeleted={load} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <ObjectiveForm memberId={member.id} onSaved={load} />
          </Section>

          <Section title={`Vendeurs gérés (${member.vendeursGeres.length})`}>
            {member.vendeursGeres.length === 0 ? (
              <p className="text-sm text-muted">Aucun vendeur attribué pour le moment.</p>
            ) : (
              <Table>
                <Thead>
                  <Tr hover={false}>
                    <Th>Boutique</Th>
                    <Th>Commune</Th>
                    <Th>Statut</Th>
                    <Th align="right">Commissions du mois</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {member.vendeursGeres.map((v) => (
                    <Tr key={v.id}>
                      <Td>
                        <Link
                          href={`/admin/vendors/${v.id}`}
                          className="font-medium text-ink hover:text-accent hover:underline"
                        >
                          {v.shopName}
                        </Link>
                      </Td>
                      <Td className="text-sm">{v.commune ?? '—'}</Td>
                      <Td className="text-sm">{VENDOR_STATUS_LABELS[v.status] ?? v.status}</Td>
                      <Td num>{fmtFcfa(v.commissionsMoisFcfa)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Section>

          <Section title={`Activité récente (${member.activite.length})`}>
            {member.activite.length === 0 ? (
              <p className="text-sm text-muted">Aucune activité consignée.</p>
            ) : (
              <ul className="divide-y divide-border">
                {member.activite.map((a) => (
                  <li key={`${a.kind}-${a.id}`} className="flex items-baseline gap-3 py-2 text-sm">
                    <span className="whitespace-nowrap font-mono text-xs text-muted">
                      {new Date(a.createdAt).toLocaleString('fr-FR')}
                    </span>
                    <span className="text-ink">{activityLabel(a.kind, a.label)}</span>
                    <span className="ml-auto text-xs text-muted-2">{a.cible}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Section title="Historique commissions (12 mois)">
            {member.commissions.length === 0 ? (
              <p className="text-sm text-muted">
                Aucune commission générée. Lancez « Générer la période » dans l’onglet Commissions.
              </p>
            ) : (
              <Table>
                <Thead>
                  <Tr hover={false}>
                    <Th>Période</Th>
                    <Th align="right">Montant</Th>
                    <Th>Statut</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {member.commissions.map((c: AgentCommission) => (
                    <Tr key={c.id}>
                      <Td className="text-sm">
                        {formatPeriode(c.periode)}
                        <div className="text-xs text-muted">
                          {c.tauxPct} % de {fmtFcfa(c.baseFcfa)}
                        </div>
                      </Td>
                      <Td num>{fmtFcfa(c.montantFcfa)}</Td>
                      <Td>
                        <Chip variant={commissionStatusVariant(c.statut)}>
                          {COMMISSION_STATUS_LABELS[c.statut]}
                        </Chip>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Section>
        </aside>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulaire d'ajout d'un objectif (mois courant)
// ---------------------------------------------------------------------------

function ObjectiveForm({ memberId, onSaved }: { memberId: string; onSaved: () => void }) {
  const [metrique, setMetrique] = useState<AgentObjectiveMetric>('VISITES_TERRAIN')
  const [cible, setCible] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cibleNum = Number.parseInt(cible, 10)
  const cibleValid = Number.isInteger(cibleNum) && cibleNum >= 1

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!cibleValid || busy) return
    setBusy(true)
    setError(null)
    const res = await equipeFetch(`/members/${memberId}/objectives`, {
      method: 'PUT',
      body: JSON.stringify({ periode: currentPeriode(), metrique, cible: cibleNum }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setCible('')
    onSaved()
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
      <select
        value={metrique}
        onChange={(e) => setMetrique(e.target.value as AgentObjectiveMetric)}
        className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        aria-label="Métrique"
      >
        {(Object.keys(METRIC_LABELS) as AgentObjectiveMetric[]).map((m) => (
          <option key={m} value={m}>
            {METRIC_LABELS[m]}
          </option>
        ))}
      </select>
      <input
        value={cible}
        onChange={(e) => setCible(e.target.value)}
        inputMode="numeric"
        placeholder="Cible (ex. 20)"
        aria-label="Cible"
        className="w-32 rounded-sm border border-border-strong bg-surface px-3 py-2 text-center font-mono text-sm"
      />
      <button
        type="submit"
        disabled={busy || !cibleValid}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
      >
        {busy ? 'Enregistrement…' : 'Fixer l’objectif'}
      </button>
      {error && <p className="w-full text-xs text-error-fg">{error}</p>}
      <p className="w-full text-xs text-muted">
        Un objectif existant pour la même métrique est remplacé.
      </p>
    </form>
  )
}

function DeleteObjectiveButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false)

  async function del() {
    if (busy || !window.confirm('Supprimer cet objectif ?')) return
    setBusy(true)
    await equipeFetch(`/objectives/${id}`, { method: 'DELETE' })
    setBusy(false)
    onDeleted()
  }

  return (
    <button
      onClick={del}
      disabled={busy}
      className="text-[11px] text-muted underline hover:text-error-fg disabled:opacity-40"
    >
      Supprimer
    </button>
  )
}

// ---------------------------------------------------------------------------
// Primitives de mise en page (gabarit fiche admin)
// ---------------------------------------------------------------------------

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
