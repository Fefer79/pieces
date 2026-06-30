'use client'

import Link from 'next/link'
import { LiaisonPartForm } from '@/components/LiaisonPartForm'

export default function NewQuickPartPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6">
      <Link
        href="/liaison/parts"
        className="mb-2 inline-block text-sm text-ink-2 hover:underline"
      >
        ← Retour aux pièces
      </Link>
      <h1 className="mb-1 font-display text-2xl text-ink">Publier une annonce (saisie rapide)</h1>
      <p className="mb-6 text-sm text-muted">
        Enregistrez le vendeur (nom, contact, commune) et publiez l&apos;annonce en une
        étape. Si ce vendeur existe déjà sous le même numéro, il est réutilisé.
      </p>
      <LiaisonPartForm mode="create" quickVendor />
    </div>
  )
}
