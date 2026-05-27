'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { liaisonFetch } from '@/lib/liaison-api'
import { LiaisonPartForm, type PartFormInitial } from '@/components/LiaisonPartForm'
import { CommissionBadge } from '@/components/CommissionBadge'

interface PartDetail extends PartFormInitial {
  id: string
  vendorId: string
  commissionAcceptedAt: string | null
}

export default function EditPartPage() {
  const params = useParams()
  const vendorId = params.id as string
  const partId = params.partId as string

  const [initial, setInitial] = useState<PartDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  useEffect(() => {
    liaisonFetch<PartDetail>(`/vendors/${vendorId}/parts/${partId}`).then((r) => {
      if (r.ok) setInitial(r.data)
      else setError(r.message)
      setLoading(false)
    })
  }, [vendorId, partId])

  const handleAccept = async () => {
    if (!initial) return
    setAccepting(true)
    setAcceptError(null)
    const r = await liaisonFetch<{ commissionAcceptedAt: string }>(
      `/vendors/${vendorId}/parts/${partId}/accept-commission`,
      { method: 'POST' },
    )
    setAccepting(false)
    if (!r.ok) {
      setAcceptError(r.message)
      return
    }
    setInitial({ ...initial, commissionAcceptedAt: r.data.commissionAcceptedAt })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6">
      <Link
        href={`/liaison/vendors/${vendorId}`}
        className="mb-2 inline-block text-sm text-ink-2 hover:underline"
      >
        ← Retour au vendeur
      </Link>
      <h1 className="mb-1 font-display text-2xl text-ink">Modifier la pièce</h1>
      <p className="mb-6 text-sm text-muted">
        Les changements sont enregistrés immédiatement.
      </p>

      {loading && <p className="text-sm text-muted">Chargement…</p>}
      {error && (
        <p className="rounded-md border border-[#D32F2F]/40 bg-[#D32F2F]/5 p-3 text-sm text-[#D32F2F]">
          {error}
        </p>
      )}
      {initial && (
        <>
          <div className="mb-5 rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
                  Commission
                </p>
                <p className="mt-1 text-sm text-ink">
                  {initial.commissionAmount != null
                    ? `${initial.commissionAmount.toLocaleString('fr-FR')} FCFA`
                    : 'Non renseignée'}
                </p>
                <div className="mt-2">
                  <CommissionBadge
                    acceptedAt={initial.commissionAcceptedAt}
                    size="sm"
                  />
                </div>
              </div>
              {!initial.commissionAcceptedAt && initial.commissionAmount != null && (
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={accepting}
                  className="rounded-md bg-[#148C50] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ minHeight: 44 }}
                >
                  {accepting ? '…' : 'Marquer agréée'}
                </button>
              )}
            </div>
            {acceptError && (
              <p className="mt-2 text-xs text-[#D32F2F]">{acceptError}</p>
            )}
            <p className="mt-3 text-[11px] text-muted-2">
              Modifier le montant ci-dessous remet l&apos;agrément à zéro.
            </p>
          </div>

          <LiaisonPartForm
            mode="edit"
            vendorId={vendorId}
            partId={partId}
            initial={initial}
          />
        </>
      )}
    </div>
  )
}
