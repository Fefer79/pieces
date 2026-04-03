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
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-[#E1DAC9]/50 px-4">
        <span className="font-[family-name:Gloock,serif] text-xl text-[#00113a]">
          Pièces<span className="text-[#ff6b00]">.</span>
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
              className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-[#002366]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      {isAuthenticated && user && (
        <div className="border-t border-gray-200 px-4 py-3">
          <p className="truncate text-xs text-gray-500">
            {ROLE_LABELS[user.activeContext ?? ''] ?? 'Utilisateur'}
          </p>
          <p className="truncate text-sm font-medium text-gray-700">
            {user.phone ?? user.email}
          </p>
        </div>
      )}
    </aside>
  )
}
