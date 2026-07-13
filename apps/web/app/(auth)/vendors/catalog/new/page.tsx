'use client'

import Link from 'next/link'
import { PartForm } from '@/components/part-form'

export default function NewCatalogItemPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <Link
        href="/vendors/catalog"
        className="mb-2 inline-block text-sm text-ink-2 hover:underline"
      >
        ← Retour au catalogue
      </Link>
      <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        Boutique · Nouvelle annonce
      </div>
      <h1 className="mb-1 mt-1 font-display text-3xl text-ink">Ajouter une pièce</h1>
      <p className="mb-2 text-sm text-muted">
        La pièce sera publiée immédiatement à votre catalogue. Photographiez
        l&apos;étiquette OEM pour remplir la référence et les compatibilités
        automatiquement.
      </p>
      <p className="mb-6 text-xs text-muted">
        Plusieurs pièces à ajouter d&apos;un coup ?{' '}
        <Link href="/vendors/catalog/upload" className="text-ink-2 underline">
          Ajout par photos (brouillons à compléter)
        </Link>
      </p>
      <PartForm actor="vendor" mode="create" />
    </div>
  )
}
