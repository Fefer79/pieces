'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/stock', label: 'Inventaire' },
  { href: '/admin/stock/achats', label: 'Achats' },
  { href: '/admin/stock/fournisseurs', label: 'Fournisseurs' },
  { href: '/admin/stock/mouvements', label: 'Mouvements' },
]

/** Barre d'onglets du module « Stock & achats » — pastilles façon filtre orders. */
export function StockTabs() {
  const pathname = usePathname()
  return (
    <div className="mb-5 flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
      {TABS.map((t) => {
        const active = t.href === '/admin/stock' ? pathname === t.href : pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
              active ? 'bg-ink font-semibold text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
