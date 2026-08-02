'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/equipe', label: 'Membres' },
  { href: '/admin/equipe/commissions', label: 'Commissions' },
]

/** Barre d'onglets du module « Équipe & commissions » — gabarit StockTabs. */
export function EquipeTabs() {
  const pathname = usePathname()
  return (
    <div className="mb-5 flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
      {TABS.map((t) => {
        // L'onglet Membres couvre aussi la fiche /admin/equipe/[id] (tout sauf
        // la branche /commissions).
        const active =
          t.href === '/admin/equipe'
            ? pathname === t.href ||
              (pathname.startsWith('/admin/equipe/') &&
                !pathname.startsWith('/admin/equipe/commissions'))
            : pathname.startsWith(t.href)
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
