'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const TITLES: { prefix: string; title: string }[] = [
  { prefix: '/dashboard', title: 'Tableau de bord' },
  { prefix: '/orders', title: 'Commandes' },
  { prefix: '/panier', title: 'Ma sélection' },
  { prefix: '/search', title: 'Recherche' },
  { prefix: '/vehicles', title: 'Mes véhicules' },
  { prefix: '/profile', title: 'Compte' },
  { prefix: '/admin', title: 'Administration' },
  { prefix: '/liaison', title: 'Liaison' },
  { prefix: '/enterprise', title: 'Flotte' },
  { prefix: '/vendors', title: 'Boutique' },
  { prefix: '/rider', title: 'Livraisons' },
]

function pageTitle(pathname: string): string {
  const match = TITLES.find((t) => pathname === t.prefix || pathname.startsWith(t.prefix + '/'))
  return match?.title ?? 'Tableau de bord'
}

function initials(user: { email: string | null; phone: string | null } | null): string {
  if (!user) return '··'
  if (user.email) return user.email.slice(0, 2).toUpperCase()
  if (user.phone) return user.phone.replace(/\D/g, '').slice(-2)
  return '··'
}

export function AppTopbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [q, setQ] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : '/search')
  }

  return (
    <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-border bg-card px-4 lg:px-7">
      <span className="hidden font-mono text-[11px] uppercase tracking-[0.08em] text-muted sm:block">
        {pageTitle(pathname)}
      </span>
      <form onSubmit={submit} className="relative max-w-[520px] flex-1">
        <svg
          className="pointer-events-none absolute left-3 top-2.5 h-[17px] w-[17px] text-muted-2"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une pièce, une référence OEM…"
          className="w-full rounded-md border border-border-strong bg-surface py-2.5 pl-10 pr-3 text-[13.5px] outline-none focus:border-ink-2"
        />
      </form>
      <div className="flex-1" />
      <button
        type="button"
        aria-label="Notifications"
        title="Notifications (bientôt disponible)"
        className="relative flex h-10 w-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 01-3.4 0" />
        </svg>
        <span className="absolute right-2.5 top-2 h-[7px] w-[7px] rounded-full bg-accent" />
      </button>
      <Link
        href="/profile"
        aria-label="Mon compte"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-2 text-[13px] font-semibold text-white"
      >
        {initials(user)}
      </Link>
    </header>
  )
}
