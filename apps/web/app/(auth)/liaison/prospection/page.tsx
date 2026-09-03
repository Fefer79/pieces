'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/chip'
import {
  PROSPECTION_INTERVIEW_STATUS_LABELS,
  type ProspectionInterviewStatusKey,
} from 'shared/constants'
import { prospectionFetch, type ProspectionList } from '@/lib/prospection-api'

const STATUS_VARIANT: Record<ProspectionInterviewStatusKey, 'status-ok' | 'status-warn' | 'plain'> = {
  BROUILLON: 'plain',
  EN_COURS: 'status-warn',
  A_TRANSCRIRE: 'status-warn',
  TRANSCRIT: 'status-warn',
  EXPLOITE: 'status-ok',
  ANNULE: 'plain',
}

export default function ProspectionInterviewsPage() {
  const [list, setList] = useState<ProspectionList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    prospectionFetch<ProspectionList>('/interviews?scope=mine&limit=100').then((r) => {
      if (r.ok) setList(r.data)
      else setError(r.message)
      setLoading(false)
    })
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Entretiens de démarchage</h1>
          <p className="mt-1 text-sm text-muted">
            Déroulez la trame vendeur, enregistrez l’échange (avec l’accord du vendeur) et
            reportez les réponses sur la fiche.
          </p>
        </div>
        <Link
          href="/liaison/prospection/new"
          className="shrink-0 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          style={{ minHeight: 44 }}
        >
          + Nouvel entretien
        </Link>
      </header>

      {error && <p className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error-fg">{error}</p>}

      {loading && (
        <div className="grid gap-2">
          <div className="h-16 animate-pulse rounded-md bg-card" />
          <div className="h-16 animate-pulse rounded-md bg-card" />
        </div>
      )}

      {!loading && list && list.items.length === 0 && (
        <p className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted">
          Aucun entretien pour l’instant. Créez-en un avant de partir en tournée.
        </p>
      )}

      {!loading && list && list.items.length > 0 && (
        <ul className="grid gap-2">
          {list.items.map((itw) => {
            const target = itw.prospect
              ? { title: itw.prospect.shopName ?? itw.prospect.name, sub: itw.prospect.phone }
              : itw.vendor
                ? { title: itw.vendor.shopName, sub: itw.vendor.phone }
                : { title: 'Sans rattachement', sub: '' }
            return (
              <li key={itw.id}>
                <Link
                  href={`/liaison/prospection/${itw.id}`}
                  className="flex items-center gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-surface"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{target.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {new Date(itw.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                      {target.sub ? ` · ${target.sub}` : ''}
                    </p>
                  </div>
                  <Chip variant={STATUS_VARIANT[itw.status]}>
                    {PROSPECTION_INTERVIEW_STATUS_LABELS[itw.status]}
                  </Chip>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-6">
        <Link href="/liaison" className="text-sm font-medium text-ink-2 hover:underline">
          ← Tableau de bord Liaison
        </Link>
      </div>
    </div>
  )
}
