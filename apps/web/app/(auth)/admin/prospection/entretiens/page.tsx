'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import {
  PROSPECTION_INTERVIEW_STATUSES,
  PROSPECTION_INTERVIEW_STATUS_LABELS,
  type ProspectionInterviewStatusKey,
} from 'shared/constants'
import type { ProspectionList } from '@/lib/prospection-api'

const STATUS_CLASSES: Record<ProspectionInterviewStatusKey, string> = {
  BROUILLON: 'bg-gray-100 text-gray-600 border-gray-200',
  EN_COURS: 'bg-amber-50 text-amber-800 border-amber-200',
  A_TRANSCRIRE: 'bg-orange-50 text-orange-800 border-orange-200',
  TRANSCRIT: 'bg-sky-50 text-sky-800 border-sky-200',
  EXPLOITE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  ANNULE: 'bg-gray-100 text-gray-400 border-gray-200',
}

export default function AdminProspectionInterviewsPage() {
  const [list, setList] = useState<ProspectionList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statut, setStatut] = useState<ProspectionInterviewStatusKey | ''>('')

  useEffect(() => {
    const q = new URLSearchParams({ scope: 'all', limit: '200' })
    if (statut) q.set('status', statut)
    adminFetch<ProspectionList>(`/prospection/interviews?${q.toString()}`)
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur serveur'))
  }, [statut])

  const counts = new Map<string, number>()
  for (const it of list?.items ?? []) counts.set(it.status, (counts.get(it.status) ?? 0) + 1)

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-1 font-display text-2xl text-ink">Entretiens de démarchage</h1>
      <p className="mb-4 text-sm text-muted">
        Supervision des entretiens vendeurs menés par les commerciaux et les liaisons. Chaque
        entretien archive l’accord du vendeur, la transcription et les réponses à la trame.
      </p>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {PROSPECTION_INTERVIEW_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatut(statut === s ? '' : s)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              STATUS_CLASSES[s]
            } ${statut === s ? 'ring-2 ring-accent ring-offset-1' : 'opacity-80 hover:opacity-100'}`}
          >
            {PROSPECTION_INTERVIEW_STATUS_LABELS[s]} · {counts.get(s) ?? 0}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Cible</Th>
              <Th>Conducteur</Th>
              <Th>Statut</Th>
              <Th>Accord vendeur</Th>
              <Th>Créé le</Th>
            </Tr>
          </Thead>
          <Tbody>
            {(list?.items ?? []).map((it) => {
              const target = it.prospect
                ? { name: it.prospect.shopName ?? it.prospect.name, sub: it.prospect.phone, kind: 'Prospect' }
                : it.vendor
                  ? { name: it.vendor.shopName, sub: it.vendor.phone, kind: 'Vendeur' }
                  : it.lead
                    ? {
                        name: it.lead.shopName ?? it.lead.name,
                        sub: it.lead.phone ?? '—',
                        kind: 'Non qualifié',
                      }
                    : { name: '—', sub: '', kind: '' }
              return (
                <Tr key={it.id}>
                  <Td>
                    <Link href={`/liaison/prospection/${it.id}`} className="font-medium text-ink hover:underline">
                      {target.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {target.kind}
                      {target.sub && <> · <span className="font-mono">{target.sub}</span></>}
                    </p>
                  </Td>
                  <Td>{it.conductedBy.name ?? <span className="text-muted">—</span>}</Td>
                  <Td>
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[it.status]}`}
                    >
                      {PROSPECTION_INTERVIEW_STATUS_LABELS[it.status]}
                    </span>
                  </Td>
                  <Td>
                    {it.status === 'BROUILLON' ? (
                      <span className="text-xs text-muted">en attente</span>
                    ) : (
                      <span className="text-xs text-emerald-700">✓ recueilli</span>
                    )}
                  </Td>
                  <Td>
                    <span className="font-mono text-xs">
                      {new Date(it.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
        {list && list.items.length === 0 && (
          <p className="p-4 text-sm text-muted">Aucun entretien pour ce filtre.</p>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">{list?.total ?? 0} entretien(s)</p>
    </div>
  )
}
