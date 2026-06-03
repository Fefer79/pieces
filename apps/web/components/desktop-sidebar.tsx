'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart'
import { ContextSwitcher } from './context-switcher'

type Icon = (p: { className?: string }) => React.ReactNode
interface NavItem {
  href: string
  label: string
  icon: Icon
  badge?: number
}
interface NavSection {
  title: string
  items: NavItem[]
}

function getSections(
  activeContext: string | null,
  isAdmin: boolean,
  cartCount: number,
  onEnterprise: boolean,
): NavSection[] {
  const adminSection: NavSection[] = isAdmin
    ? [{ title: 'Admin', items: [
        { href: '/admin', label: 'Administration', icon: GridIcon },
        { href: '/liaison', label: 'Liaison', icon: UsersIcon },
      ] }]
    : []

  // Sur les pages /enterprise/*, on déroule la navigation flotte complète
  // (indépendamment de activeContext), pour que les 10 sections soient
  // accessibles depuis le shell Cockpit.
  if (onEnterprise) {
    return [
      { title: 'Flotte', items: [
        { href: '/enterprise/dashboard', label: 'Tableau de bord', icon: GridIcon },
        { href: '/enterprise/vehicles', label: 'Véhicules', icon: CarIcon },
        { href: '/enterprise/drivers', label: 'Chauffeurs', icon: WheelIcon },
        { href: '/enterprise/members', label: 'Membres', icon: UsersIcon },
        { href: '/enterprise/orders', label: 'Commandes', icon: OrdersIcon },
        { href: '/enterprise/search', label: 'Recherche', icon: SearchIcon },
        { href: '/enterprise/centers', label: 'Centres', icon: BuildingIcon },
        { href: '/enterprise/returns', label: 'Retours', icon: ReturnIcon },
        { href: '/enterprise/buffer-stock', label: 'Stock tampon', icon: BoxIcon },
        { href: '/enterprise/invoices', label: 'Factures', icon: FileIcon },
        { href: '/enterprise/billing', label: 'Abonnement', icon: CardIcon },
      ] },
      { title: 'Compte', items: [
        { href: '/dashboard', label: 'Retour à l’app', icon: HomeIcon },
      ] },
      ...adminSection,
    ]
  }

  switch (activeContext) {
    case 'SELLER':
      return [
        { title: 'Vendre', items: [
          { href: '/dashboard', label: 'Accueil', icon: HomeIcon },
          { href: '/vendors/catalog', label: 'Boutique', icon: ShopIcon },
          { href: '/orders', label: 'Commandes', icon: OrdersIcon },
        ] },
        ...adminSection,
      ]
    case 'RIDER':
      return [
        { title: 'Livrer', items: [
          { href: '/dashboard', label: 'Accueil', icon: HomeIcon },
          { href: '/rider', label: 'Livraisons', icon: DeliveryIcon },
        ] },
        ...adminSection,
      ]
    case 'ENTERPRISE':
      return [
        { title: 'Flotte', items: [
          { href: '/dashboard', label: 'Accueil', icon: HomeIcon },
          { href: '/enterprise/dashboard', label: 'Tableau de bord', icon: GridIcon },
          { href: '/orders', label: 'Commandes', icon: OrdersIcon },
        ] },
        ...adminSection,
      ]
    case 'LIAISON':
      return [
        { title: 'Liaison', items: [
          { href: '/liaison', label: 'Tableau de bord', icon: GridIcon },
          { href: '/liaison/vendors', label: 'Vendeurs', icon: ShopIcon },
          { href: '/liaison/parts', label: 'Pièces', icon: OrdersIcon },
        ] },
        ...adminSection,
      ]
    case 'DRIVER':
      return [
        { title: 'Chauffeur', items: [
          { href: '/driver', label: 'Mon espace', icon: WheelIcon },
        ] },
        ...adminSection,
      ]
    default:
      // MECHANIC, OWNER, or null
      return [
        { title: 'Acheter', items: [
          { href: '/dashboard', label: 'Accueil', icon: HomeIcon },
          { href: '/search', label: 'Rechercher', icon: SearchIcon },
          { href: '/panier', label: 'Ma sélection', icon: CartIcon, badge: cartCount },
        ] },
        { title: 'Gérer', items: [
          { href: '/orders', label: 'Commandes', icon: OrdersIcon },
          { href: '/vehicles', label: 'Mes véhicules', icon: CarIcon },
        ] },
        ...adminSection,
      ]
  }
}

export function DesktopSidebar() {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuth()
  const { count } = useCart()
  const isAdmin = user?.roles?.includes('ADMIN') ?? false

  if (!isAuthenticated) {
    return (
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:bg-ink lg:text-white">
        <div className="flex h-16 items-center px-5">
          <span className="font-display text-2xl text-white">
            Pièces<span className="text-accent">.</span>
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          <Link href="/" className="block rounded-md px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/[0.06] hover:text-white">Accueil</Link>
          <Link href="/login" className="block rounded-md px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/[0.06] hover:text-white">Connexion</Link>
        </nav>
      </aside>
    )
  }

  const onEnterprise = pathname.startsWith('/enterprise')
  const sections = getSections(user?.activeContext ?? null, isAdmin, count, onEnterprise)

  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:bg-ink lg:text-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-5">
        <span className="font-display text-2xl text-white">
          Pièces<span className="text-accent">.</span>
        </span>
      </div>

      {/* Context switcher */}
      <div className="px-3 pb-1">
        <ContextSwitcher variant="dark" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section) => (
          <div key={section.title} className="mt-4 first:mt-1">
            <h4 className="px-2.5 pb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
              {section.title}
            </h4>
            {section.items.map(({ href, label, icon: Icon, badge }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-md border-l-[3px] px-2.5 py-2.5 text-[13.5px] font-medium transition-colors ${
                    active
                      ? 'border-accent bg-white/[0.09] text-white'
                      : 'border-transparent text-white/72 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1">{label}</span>
                  {badge != null && badge > 0 && (
                    <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[11px] text-white">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Account + logout */}
      <div className="mt-auto flex items-center gap-2.5 border-t border-white/12 px-4 py-3">
        <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-2.5 text-white/75 hover:text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/12 text-[11px]">
            <UserIcon className="h-4 w-4" />
          </span>
          <span className="truncate text-[13px]">Mon profil</span>
        </Link>
        <button
          type="button"
          onClick={logout}
          aria-label="Se déconnecter"
          className="text-white/50 hover:text-white"
        >
          <LogoutIcon className="h-[18px] w-[18px]" />
        </button>
      </div>
    </aside>
  )
}

/* ---- Icons (stroke = currentColor) ---- */
const sv = (p: { className?: string; children: React.ReactNode }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p.children}</svg>
)
const HomeIcon: Icon = ({ className }) => sv({ className, children: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></> })
const SearchIcon: Icon = ({ className }) => sv({ className, children: <><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></> })
const CartIcon: Icon = ({ className }) => sv({ className, children: <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></> })
const OrdersIcon: Icon = ({ className }) => sv({ className, children: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></> })
const CarIcon: Icon = ({ className }) => sv({ className, children: <><path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2M7 21h10" /><circle cx="7.5" cy="17.5" r="1" /><circle cx="16.5" cy="17.5" r="1" /></> })
const GridIcon: Icon = ({ className }) => sv({ className, children: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></> })
const UsersIcon: Icon = ({ className }) => sv({ className, children: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /></> })
const ShopIcon: Icon = ({ className }) => sv({ className, children: <><path d="M3 9l1-5h16l1 5M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M3 9h18" /></> })
const DeliveryIcon: Icon = ({ className }) => sv({ className, children: <><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></> })
const UserIcon: Icon = ({ className }) => sv({ className, children: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></> })
const BuildingIcon: Icon = ({ className }) => sv({ className, children: <><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21V12h6v9" /></> })
const ReturnIcon: Icon = ({ className }) => sv({ className, children: <><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 00-4-4H4" /></> })
const BoxIcon: Icon = ({ className }) => sv({ className, children: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></> })
const FileIcon: Icon = ({ className }) => sv({ className, children: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></> })
const CardIcon: Icon = ({ className }) => sv({ className, children: <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></> })
const WheelIcon: Icon = ({ className }) => sv({ className, children: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="9" x2="12" y2="3" /><line x1="9.5" y1="13.5" x2="4.5" y2="17" /><line x1="14.5" y1="13.5" x2="19.5" y2="17" /></> })
const LogoutIcon: Icon = ({ className }) => sv({ className, children: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></> })
