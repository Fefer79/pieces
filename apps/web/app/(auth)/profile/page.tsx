'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { spaceForRole, spacesForRoles } from '@/lib/spaces'

// Hub du compte : carte d'identité + navigation vers les sous-pages.
// Le contenu (formulaires, espaces, sécurité) vit dans les sous-pages —
// un écran, un sujet.
export default function ProfilePage() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted">Chargement…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-4">
        <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          Profil introuvable
        </div>
      </main>
    )
  }

  const currentSpace = spaceForRole(user.activeContext)
  const mySpaces = spacesForRoles(user.roles)
  const initials = user.name
    ? user.name
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user.email
      ? user.email.slice(0, 2).toUpperCase()
      : (user.phone ?? '··').replace(/\D/g, '').slice(-2)

  const entries = [
    {
      href: '/profile/identite',
      label: 'Identité',
      hint: [user.name, user.email].filter(Boolean).join(' · ') || 'Nom, email, téléphone',
      icon: UserIcon,
    },
    {
      href: '/profile/cotations',
      label: 'Mes cotations logistique',
      hint: 'Demandes d\'import de pièces',
      icon: TruckIcon,
    },
    {
      href: '/profile/espaces',
      label: 'Mes espaces',
      hint: mySpaces.map((s) => s.label.replace('Espace ', '')).join(' · '),
      icon: GridIcon,
    },
    {
      href: '/profile/securite',
      label: 'Sécurité',
      hint: 'Mot de passe, connexion',
      icon: LockIcon,
    },
    {
      href: '/profile/data',
      label: 'Mes données',
      hint: 'Confidentialité, export, suppression',
      icon: FolderIcon,
    },
  ]

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Compte
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Mon profil</h1>
      </div>

      <section className="mb-4 flex items-center gap-3.5 rounded-md border border-border bg-card p-5">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent text-[15px] font-semibold text-white">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {user.name ?? user.email ?? user.phone ?? 'Mon compte'}
          </p>
          {user.phone && <p className="font-mono text-xs text-muted">{user.phone}</p>}
          {currentSpace && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-ink-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-white">
              <span className="text-accent">●</span>
              {currentSpace.label}
            </span>
          )}
        </div>
      </section>

      <nav className="mb-4 overflow-hidden rounded-md border border-border bg-card">
        {entries.map(({ href, label, hint, icon: Icon }, i) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface ${
              i > 0 ? 'border-t border-border' : ''
            }`}
            style={{ minHeight: '56px' }}
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm bg-[rgba(0,35,102,0.08)] text-ink-2">
              <Icon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{label}</span>
              <span className="block truncate text-xs text-muted">{hint}</span>
            </span>
            <ChevronIcon />
          </Link>
        ))}
      </nav>

      <button
        onClick={logout}
        className="w-full rounded-md border border-error-fg/30 bg-error-bg/40 px-4 py-3 text-sm font-semibold text-error-fg transition-colors hover:border-error-fg/50"
        style={{ minHeight: '48px' }}
      >
        Se déconnecter
      </button>
    </main>
  )
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2a2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg className="flex-shrink-0 text-muted-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
