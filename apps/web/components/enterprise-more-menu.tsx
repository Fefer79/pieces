'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Toutes les sections flotte — le tiroir « Plus » garantit l'accès mobile aux
// pages absentes de la barre du bas (Dashboard / Véhicules / Commandes).
const ENTERPRISE_LINKS = [
  { href: '/enterprise/dashboard', label: 'Tableau de bord' },
  { href: '/enterprise/vehicles', label: 'Véhicules' },
  { href: '/enterprise/members', label: 'Membres' },
  { href: '/enterprise/orders', label: 'Commandes' },
  { href: '/enterprise/search', label: 'Recherche' },
  { href: '/enterprise/centers', label: 'Centres' },
  { href: '/enterprise/returns', label: 'Retours' },
  { href: '/enterprise/buffer-stock', label: 'Stock tampon' },
  { href: '/enterprise/invoices', label: 'Factures' },
  { href: '/enterprise/billing', label: 'Abonnement' },
] as const

// Pages atteignables uniquement via le tiroir (hors raccourcis de la barre) :
// le bouton « Plus » s'allume quand on est sur l'une d'elles.
const BAR_HREFS = new Set(['/enterprise/dashboard', '/enterprise/vehicles', '/enterprise/orders'])

export function EnterpriseMoreMenu() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const onDrawerOnlyPage =
    pathname.startsWith('/enterprise') &&
    !Array.from(BAR_HREFS).some((h) => pathname === h || pathname.startsWith(h + '/'))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Plus de sections"
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 px-3 py-2 transition-colors ${
          onDrawerOnlyPage ? 'text-ink-2' : 'text-muted hover:text-ink'
        }`}
      >
        <MoreIcon />
        <span className={`text-[11px] ${onDrawerOnlyPage ? 'font-semibold' : 'font-medium'}`}>
          Plus
        </span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-card shadow-xl transition-transform duration-300 lg:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Flotte
          </span>
          <button
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
            aria-label="Fermer le menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <ul className="space-y-1">
            {ENTERPRISE_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/')
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? 'bg-[rgba(0,35,102,0.06)] font-semibold text-ink-2'
                        : 'font-medium text-ink hover:bg-surface hover:text-ink-2'
                    }`}
                  >
                    <span>{link.label}</span>
                    <span className="text-muted-2">→</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-4">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block rounded-md border border-border-strong bg-card px-4 py-2.5 text-center text-sm font-semibold text-ink hover:bg-surface"
          >
            Retour à l’app
          </Link>
        </div>
      </div>
    </>
  )
}

function MoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </svg>
  )
}
