'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  equipeFetch,
  fmtFcfa,
  type AgentCommission,
  type AgentCommissionList,
  type AgentCommissionStatus,
  type GenerateCommissionsResult,
} from '@/lib/equipe-api'
import {
  COMMISSION_STATUS_LABELS,
  commissionStatusVariant,
  currentPeriode,
  formatPeriode,
  formatShortDate,
  recentPeriodes,
} from '@/lib/equipe-utils'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const PERIODES = recentPeriodes(12)

export default function EquipeCommissionsPage() {
  const [data, setData] = useState<AgentCommissionList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [periode, setPeriode] = useState(currentPeriode())
  const [statut, setStatut] = useState('')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)

  const [editing, setEditing] = useState<AgentCommission | null>(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (periode) params.set('periode', periode)
    if (statut) params.set('statut', statut)
    params.set('page', String(page))
    equipeFetch<AgentCommissionList>(`/commissions?${params}`).then((res) => {
      if (res.ok) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [periode, statut, page])

  useEffect(() => {
    load()
  }, [load])

  async function generate() {
    if (
      busy ||
      !window.confirm(
        `Générer les commissions de ${formatPeriode(periode)} ?\n\nLes commissions payées ou annulées ne seront pas touchées.`,
      )
    )
      return
    setBusy(true)
    setError(null)
    setNotice(null)
    const res = await equipeFetch<GenerateCommissionsResult>('/commissions/generate', {
      method: 'POST',
      body: JSON.stringify({ periode }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setNotice(
      `${formatPeriode(res.data.periode)} : ${res.data.creees} créée(s), ${res.data.misesAJour} mise(s) à jour, ${res.data.sautees} sautée(s) (payées ou annulées).`,
    )
    load()
  }

  async function transition(c: AgentCommission, action: 'pay' | 'cancel') {
    if (busy) return
    const message =
      action === 'pay'
        ? `Marquer payée la commission de ${c.agent?.name ?? 'ce membre'} (${fmtFcfa(c.montantFcfa)}) ?`
        : `Annuler la commission de ${c.agent?.name ?? 'ce membre'} (${fmtFcfa(c.montantFcfa)}) ?`
    if (!window.confirm(message)) return
    setBusy(true)
    setError(null)
    const res = await equipeFetch<AgentCommission>(`/commissions/${c.id}/${action}`, {
      method: 'POST',
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    load()
  }

  return (
    <div>
      <div className="mb-4 rounded-md border border-border bg-surface p-4 text-[13px] leading-relaxed text-muted">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em]">
          Règle de calcul
        </span>
        <p className="mt-1">
          Commission d’un agent pour un mois = <strong>son taux %</strong> × la somme des{' '}
          <strong>commissions plateforme</strong> des commandes terminées du mois dont le vendeur
          est <strong>actuellement géré</strong> par l’agent. Montant arrondi aux 100 F. Base nulle
          → statut « Estimée ». Une commission « Payée » (ou « Annulée ») n’est jamais réécrite par
          une régénération.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={periode}
          onChange={(e) => {
            setPage(1)
            setPeriode(e.target.value)
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          {PERIODES.map((p) => (
            <option key={p} value={p}>
              {formatPeriode(p)}
            </option>
          ))}
        </select>
        <select
          value={statut}
          onChange={(e) => {
            setPage(1)
            setStatut(e.target.value)
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(COMMISSION_STATUS_LABELS) as AgentCommissionStatus[]).map((s) => (
            <option key={s} value={s}>
              {COMMISSION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={busy}
          className="ml-auto rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
        >
          {busy ? 'Génération…' : 'Générer la période'}
        </button>
      </div>

      {notice && (
        <div className="mb-3 rounded-md border border-success-fg/20 bg-success-bg p-3 text-sm text-success-fg">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {!data ? (
        <div className="text-sm text-muted">Chargement…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Membre</Th>
                  <Th>Période</Th>
                  <Th align="right">Base</Th>
                  <Th align="right">Taux</Th>
                  <Th align="right">Montant</Th>
                  <Th>Statut</Th>
                  <Th>Payée le</Th>
                  <Th align="right"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.commissions.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <Link
                        href={`/admin/equipe/${c.agentId}`}
                        className="font-medium text-ink hover:text-accent hover:underline"
                      >
                        {c.agent?.name ?? '—'}
                      </Link>
                      {c.agent?.phone && (
                        <div className="font-mono text-xs text-muted">{c.agent.phone}</div>
                      )}
                      {c.note && (
                        <div className="max-w-[200px] truncate text-xs text-muted-2">{c.note}</div>
                      )}
                    </Td>
                    <Td className="text-sm">{formatPeriode(c.periode)}</Td>
                    <Td num>{fmtFcfa(c.baseFcfa)}</Td>
                    <Td num>{c.tauxPct} %</Td>
                    <Td num className="font-semibold">
                      {fmtFcfa(c.montantFcfa)}
                    </Td>
                    <Td>
                      <Chip variant={commissionStatusVariant(c.statut)}>
                        {COMMISSION_STATUS_LABELS[c.statut]}
                      </Chip>
                    </Td>
                    <Td className="text-xs text-muted">{formatShortDate(c.paidAt)}</Td>
                    <Td align="right">
                      {c.statut !== 'PAYEE' && c.statut !== 'ANNULEE' && (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditing(c)}
                            className="rounded-sm border border-border-strong px-2 py-1 text-[11px] font-medium hover:bg-surface"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => transition(c, 'pay')}
                            disabled={busy}
                            className="rounded-sm border border-success-fg/30 px-2 py-1 text-[11px] font-medium text-success-fg hover:bg-success-bg disabled:opacity-40"
                          >
                            Marquer payée
                          </button>
                          <button
                            onClick={() => transition(c, 'cancel')}
                            disabled={busy}
                            className="rounded-sm border border-error-fg/30 px-2 py-1 text-[11px] font-medium text-error-fg hover:bg-error-bg disabled:opacity-40"
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </Td>
                  </Tr>
                ))}
                {data.commissions.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={8} align="center" className="py-6 text-muted">
                      Aucune commission sur ces critères. Lancez « Générer la période ».
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>
              {data.total} commissions · page {data.page}/
              {Math.max(1, Math.ceil(data.total / data.limit))}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40"
              >
                ←
              </button>
              <button
                disabled={page >= Math.ceil(data.total / data.limit)}
                onClick={() => setPage(page + 1)}
                className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        </>
      )}

      {editing && (
        <EditCommissionDialog
          commission={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Édition du montant / de la note (tant que non payée)
// ---------------------------------------------------------------------------

function EditCommissionDialog({
  commission,
  onClose,
  onSaved,
}: {
  commission: AgentCommission
  onClose: () => void
  onSaved: () => void
}) {
  const [montant, setMontant] = useState(String(commission.montantFcfa))
  const [note, setNote] = useState(commission.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const montantNum = Number.parseInt(montant, 10)
  const montantValid = Number.isInteger(montantNum) && montantNum >= 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!montantValid || busy) return
    setBusy(true)
    setError(null)
    const res = await equipeFetch(`/commissions/${commission.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ montantFcfa: montantNum, note: note.trim() || null }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Modifier la commission</h2>
          <button onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <p className="mb-3 text-sm text-muted">
          {commission.agent?.name ?? 'Membre'} · {formatPeriode(commission.periode)} · base{' '}
          <span className="font-mono">{fmtFcfa(commission.baseFcfa)}</span> ×{' '}
          <span className="font-mono">{commission.tauxPct} %</span>
        </p>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-xs text-muted">
            Montant FCFA
            <input
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 font-mono text-sm"
            />
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (prime, ajustement, motif…)"
            className="w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-error-fg">{error}</p>}
          <button
            type="submit"
            disabled={busy || !montantValid}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
