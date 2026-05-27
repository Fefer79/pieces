'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { LiaisonPartForm } from '@/components/LiaisonPartForm'

export default function NewPartPage() {
  const params = useParams()
  const vendorId = params.id as string

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6">
      <Link
        href={`/liaison/vendors/${vendorId}`}
        className="mb-2 inline-block text-sm text-ink-2 hover:underline"
      >
        ← Retour au vendeur
      </Link>
      <h1 className="mb-1 font-display text-2xl text-ink">Ajouter une pièce</h1>
      <p className="mb-6 text-sm text-muted">
        La pièce sera publiée immédiatement au catalogue du vendeur.
      </p>
      <LiaisonPartForm mode="create" vendorId={vendorId} />
    </div>
  )
}
