'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

const NAV = [
  { href: '/admin', label: 'Tableau de bord' },
  { href: '/admin/finances', label: 'Modélisation' },
  { href: '/admin/parts', label: 'Pièces' },
  { href: '/admin/vendors', label: 'Vendeurs' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/enterprises', label: 'Entreprises' },
  { href: '/admin/liaisons', label: 'Liaisons' },
  { href: '/admin/external-imports', label: 'Imports externes' },
  { href: '/admin/catalog', label: 'Catalogue (legacy)' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }
  const [checking, setChecking] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  const guard = useCallback(async () => {
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
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

  useEffect(() => { guard() }, [guard])

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
      <aside className="hidden w-60 shrink-0 flex-col bg-ink text-white lg:flex">
        {/* Logo */}
        <div className="flex h-16 items-center px-5">
          <Link href="/" className="font-display text-2xl text-white">
            Pièces<span className="text-accent">.</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <h4 className="px-2.5 pb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
            Administration
          </h4>
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href))
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-md border-l-[3px] px-2.5 py-2.5 text-[13.5px] font-medium transition-colors ${
                  active
                    ? 'border-accent bg-white/[0.09] text-white'
                    : 'border-transparent text-white/72 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {n.label}
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
            {NAV.map((n) => <option key={n.href} value={n.href}>{n.label}</option>)}
          </select>
        </div>
        {children}
      </main>
    </div>
  )
}
