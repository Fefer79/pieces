'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/role-labels'

interface NavItem {
  href: string
  label: string
}

function getNavItems(activeContext: string | null, isAuthenticated: boolean): NavItem[] {
  if (!isAuthenticated) {
    return [
      { href: '/', label: 'Accueil' },
      { href: '/login', label: 'Connexion' },
    ]
  }

  switch (activeContext) {
    case 'SELLER':
      return [
        { href: '/', label: 'Accueil' },
        { href: '/vendors/catalog', label: 'Boutique' },
        { href: '/orders', label: 'Commandes' },
        { href: '/profile', label: 'Profil' },
      ]
    case 'RIDER':
      return [
        { href: '/', label: 'Accueil' },
        { href: '/rider', label: 'Livraisons' },
        { href: '/profile', label: 'Profil' },
      ]
    case 'ENTERPRISE':
      return [
        { href: '/', label: 'Accueil' },
        { href: '/enterprise/dashboard', label: 'Dashboard' },
        { href: '/profile', label: 'Profil' },
      ]
    case 'LIAISON':
      return [
        { href: '/liaison', label: 'Tableau de bord' },
        { href: '/liaison/vendors', label: 'Vendeurs' },
        { href: '/liaison/parts', label: 'Pièces' },
        { href: '/profile', label: 'Profil' },
      ]
    default:
      return [
        { href: '/', label: 'Accueil' },
        { href: '/orders', label: 'Commandes' },
        { href: '/profile', label: 'Profil' },
      ]
  }
}

export function DesktopSidebar() {
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuth()
  const items = getNavItems(user?.activeContext ?? null, isAuthenticated)

  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-border lg:bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-5">
        <span className="font-display text-2xl text-ink">
          Pièces<span className="text-accent">.</span>
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map(({ href, label }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center rounded-md px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-[rgba(0,35,102,0.08)] font-semibold text-ink-2'
                  : 'font-medium text-muted hover:bg-surface hover:text-ink'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      {isAuthenticated && user && (
        <div className="border-t border-border px-4 py-3.5">
          <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
            {ROLE_LABELS[user.activeContext ?? ''] ?? 'Utilisateur'}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-ink">
            {user.phone ?? user.email}
          </p>
        </div>
      )}
    </aside>
  )
}
