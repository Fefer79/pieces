'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { SPACES, spaceForRole, type Space } from '@/lib/spaces'

// « Mes espaces » : un seul endroit pour voir, rejoindre et activer les
// espaces. Trois états par carte : courant / activé / non activé.
// L'activation passe par la navigation vers l'espace : le SpaceGuard y montre
// l'interstitiel de confirmation — un seul flux d'activation dans toute l'app.
// Les espaces attribués (Livreur, Chauffeur, Liaison, Administration) ne sont
// affichés que si l'utilisateur possède déjà le rôle.
export default function SpacesPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted">Chargement…</p>
      </main>
    )
  }

  if (!user) return null

  const roles = user.roles ?? []
  const current = spaceForRole(user.activeContext)
  const visible = SPACES.filter(
    (s) => roles.some((r) => s.matchRoles.includes(r)) || s.activation,
  )

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <Link
          href="/profile"
          className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted hover:text-ink"
        >
          ← Compte
        </Link>
        <h1 className="mt-1 font-display text-3xl text-ink">Mes espaces</h1>
        <p className="mt-2 text-sm text-muted">
          Un même compte, plusieurs espaces. Vous pouvez passer de l&apos;un à
          l&apos;autre à tout moment.
        </p>
      </div>

      <div className="space-y-3">
        {visible.map((space) => (
          <SpaceCard
            key={space.key}
            space={space}
            owned={roles.some((r) => space.matchRoles.includes(r))}
            isCurrent={space.key === current?.key}
          />
        ))}
      </div>
    </main>
  )
}

function SpaceCard({
  space,
  owned,
  isCurrent,
}: {
  space: Space
  owned: boolean
  isCurrent: boolean
}) {
  return (
    <section
      className={`rounded-md border bg-card p-5 ${
        isCurrent ? 'border-accent' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-body text-sm font-semibold text-ink">{space.label}</h2>
          <p className="mt-1 text-xs text-muted">{space.description}</p>
        </div>
        {isCurrent && (
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-ink-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-white">
            <span className="text-accent">●</span> Vous êtes ici
          </span>
        )}
        {!isCurrent && owned && (
          <span className="inline-flex flex-shrink-0 items-center rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">
            Activé
          </span>
        )}
      </div>

      {!isCurrent && owned && (
        <Link
          href={space.root}
          className="mt-4 block w-full rounded-md border border-border-strong bg-card px-4 py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-surface"
          style={{ minHeight: '44px' }}
        >
          Aller à cet espace
        </Link>
      )}

      {!owned && (
        <Link
          href={space.root}
          className="mt-4 block w-full rounded-md border border-border-strong bg-card px-4 py-2.5 text-center text-sm font-semibold text-ink-2 transition-colors hover:border-ink-2 hover:bg-surface"
          style={{ minHeight: '44px' }}
        >
          + Activer cet espace
        </Link>
      )}
    </section>
  )
}
