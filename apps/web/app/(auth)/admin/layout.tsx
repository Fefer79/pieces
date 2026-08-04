'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useCollapsed } from '@/lib/use-collapsed'

type SupabaseClient = ReturnType<typeof createClient>

const NAV = [
  { href: '/admin', label: 'Tableau de bord' },
  { href: '/admin/finances', label: 'Modélisation' },
  { href: '/admin/parts', label: 'Pièces' },
  { href: '/admin/enrichments', label: 'Fiches terrain' },
  { href: '/admin/vendors', label: 'Vendeurs' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/crm', label: 'CRM' },
  { href: '/admin/marketing', label: 'Marketing' },
  { href: '/admin/support', label: 'SAV' },
  { href: '/admin/stock', label: 'Stock & achats' },
  { href: '/admin/finance', label: 'Finance' },
  { href: '/admin/enterprises', label: 'Entreprises' },
  { href: '/admin/liaisons', label: 'Liaisons' },
  { href: '/admin/equipe', label: 'Équipe' },
  { href: '/admin/prospection', label: 'Prospection' },
  { href: '/admin/logistique', label: 'Cotations logistique' },
  { href: '/admin/sourcing', label: 'Sourcing' },
  { href: '/admin/expeditions', label: 'Expéditions' },
  { href: '/admin/external-imports', label: 'Imports externes' },
]

const svg = (p: { className?: string; children: React.ReactNode }) => (
  <svg
    className={p.className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {p.children}
  </svg>
)
const ChevronsLeftIcon = ({ className }: { className?: string }) =>
  svg({
    className,
    children: (
      <>
        <polyline points="11 17 6 12 11 7" />
        <polyline points="18 17 13 12 18 7" />
      </>
    ),
  })
const ChevronDownIcon = ({ className }: { className?: string }) =>
  svg({ className, children: <polyline points="6 9 12 15 18 9" /> })

const STOP_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', '&', 'et'])

/** « Stock & achats » → « SA » : repère lisible quand le rail est replié. */
function abbreviate(label: string): string {
  const words = label.split(' ').filter((w) => w && !STOP_WORDS.has(w.toLowerCase()))
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  // Deux replis indépendants : le rail entier, et la liste des sections sous
  // le titre « Administration ».
  const [railCollapsed, toggleRail] = useCollapsed('pieces.adminRail.collapsed')
  const [navCollapsed, toggleNav] = useCollapsed('pieces.adminNav.collapsed')
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }
  const [checking, setChecking] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  const guard = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await getSupabase().auth.getSession()
      const token = session?.access_token
      if (!token) {
        router.push('/login')
        return
      }
      const res = await fetch('/api/v1/users/me', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        router.push('/login')
        return
      }
      const body = await res.json()
      const roles = (body.data?.roles ?? []) as string[]
      if (!roles.includes('ADMIN')) {
        setForbidden(true)
      }
    } finally {
      setChecking(false)
    }
  }, [router])

  useEffect(() => {
    guard()
  }, [guard])

  if (checking) {
    return <div className="p-8 text-sm text-muted">Vérification des droits…</div>
  }
  if (forbidden) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold text-ink">Accès refusé</h1>
        <p className="mt-2 text-sm text-muted">Cette zone est réservée aux administrateurs.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside
        className={`hidden shrink-0 flex-col bg-ink text-white lg:flex ${
          railCollapsed ? 'w-[52px]' : 'w-60'
        }`}
      >
        {/* Logo + repli du rail */}
        <div
          className={`flex h-16 items-center ${railCollapsed ? 'justify-center px-1' : 'px-5'}`}
        >
          {!railCollapsed && (
            <Link href="/" className="flex-1 font-display text-2xl text-white">
              Pièces<span className="text-accent">.</span>
            </Link>
          )}
          <button
            type="button"
            onClick={toggleRail}
            aria-label={railCollapsed ? 'Déplier le menu admin' : 'Replier le menu admin'}
            aria-expanded={!railCollapsed}
            title={railCollapsed ? 'Déplier le menu admin' : 'Replier le menu admin'}
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <ChevronsLeftIcon
              className={`h-[18px] w-[18px] ${railCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
        <nav className={`flex-1 overflow-y-auto py-3 ${railCollapsed ? 'px-1.5' : 'px-3'}`}>
          {railCollapsed ? (
            <div className="mx-1.5 mb-2 h-px bg-white/12" />
          ) : (
            <button
              type="button"
              onClick={toggleNav}
              aria-expanded={!navCollapsed}
              className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
            >
              <ChevronDownIcon
                className={`h-3 w-3 transition-transform ${navCollapsed ? '-rotate-90' : ''}`}
              />
              <span>Administration</span>
              {navCollapsed && <span className="ml-auto normal-case">{NAV.length}</span>}
            </button>
          )}
          {(railCollapsed || !navCollapsed) &&
            NAV.map((n) => {
              const active =
                pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href + '/'))
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  title={railCollapsed ? n.label : undefined}
                  className={`flex items-center rounded-md border-l-[3px] py-2.5 text-[13.5px] font-medium transition-colors ${
                    railCollapsed ? 'justify-center px-0' : 'gap-3 px-2.5'
                  } ${
                    active
                      ? 'border-accent bg-white/[0.09] text-white'
                      : 'border-transparent text-white/72 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {railCollapsed ? (
                    <>
                      <span aria-hidden className="font-mono text-[11px] tracking-tight">
                        {abbreviate(n.label)}
                      </span>
                      <span className="sr-only">{n.label}</span>
                    </>
                  ) : (
                    n.label
                  )}
                </Link>
              )
            })}
        </nav>
      </aside>
      <main className="flex-1">
        <div className="border-b border-border bg-card px-4 py-2 lg:hidden">
          <select
            value={pathname}
            onChange={(e) => router.push(e.target.value)}
            className="w-full rounded-sm border border-border-strong bg-surface px-2 py-2 text-sm"
          >
            {NAV.map((n) => (
              <option key={n.href} value={n.href}>
                {n.label}
              </option>
            ))}
          </select>
        </div>
        {children}
      </main>
    </div>
  )
}
