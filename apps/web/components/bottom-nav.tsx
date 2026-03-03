'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

interface NavItem {
  href: string
  label: string
  icon: (props: { active: boolean }) => React.ReactNode
}

function getNavItems(activeContext: string | null, isAuthenticated: boolean): NavItem[] {
  if (!isAuthenticated) {
    return [
      { href: '/', label: 'Accueil', icon: HomeIcon },
      { href: '/login', label: 'Connexion', icon: LoginIcon },
    ]
  }

  switch (activeContext) {
    case 'SELLER':
      return [
        { href: '/', label: 'Accueil', icon: HomeIcon },
        { href: '/vendors/catalog', label: 'Boutique', icon: ShopIcon },
        { href: '/orders', label: 'Commandes', icon: OrdersIcon },
        { href: '/profile', label: 'Profil', icon: ProfileIcon },
      ]
    case 'RIDER':
      return [
        { href: '/', label: 'Accueil', icon: HomeIcon },
        { href: '/rider', label: 'Livraisons', icon: DeliveryIcon },
        { href: '/profile', label: 'Profil', icon: ProfileIcon },
      ]
    case 'ENTERPRISE':
      return [
        { href: '/', label: 'Accueil', icon: HomeIcon },
        { href: '/enterprise/dashboard', label: 'Dashboard', icon: DashboardIcon },
        { href: '/profile', label: 'Profil', icon: ProfileIcon },
      ]
    default:
      // MECHANIC, OWNER, or null
      return [
        { href: '/', label: 'Accueil', icon: HomeIcon },
        { href: '/orders', label: 'Commandes', icon: OrdersIcon },
        { href: '/profile', label: 'Profil', icon: ProfileIcon },
      ]
  }
}

export function BottomNav() {
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuth()
  const items = getNavItems(user?.activeContext ?? null, isAuthenticated)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[48px] min-w-[48px] flex-col items-center justify-center px-3 py-2 text-xs transition-colors ${
                isActive ? 'text-[#1976D2]' : 'text-gray-500'
              }`}
            >
              <Icon active={isActive} />
              <span className="mt-1">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1976D2' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function OrdersIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1976D2' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1976D2' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function LoginIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1976D2' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  )
}

function ShopIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1976D2' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  )
}

function DeliveryIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1976D2' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1976D2' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}
