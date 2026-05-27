'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { liaisonFetch } from '@/lib/liaison-api'
import { LiaisonPartForm, type PartFormInitial } from '@/components/LiaisonPartForm'

interface PartDetail extends PartFormInitial {
  id: string
  vendorId: string
}

export default function EditPartPage() {
  const params = useParams()
  const vendorId = params.id as string
  const partId = params.partId as string

  const [initial, setInitial] = useState<PartDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    liaisonFetch<PartDetail>(`/vendors/${vendorId}/parts/${partId}`).then((r) => {
      if (r.ok) setInitial(r.data)
      else setError(r.message)
      setLoading(false)
    })
  }, [vendorId, partId])

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
        <LiaisonPartForm
          mode="edit"
          vendorId={vendorId}
          partId={partId}
          initial={initial}
        />
      )}
    </div>
  )
}
