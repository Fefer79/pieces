'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/finance', label: "Vue d'ensemble" },
  { href: '/admin/finance/vendeurs', label: 'Vendeurs' },
  { href: '/admin/finance/exports', label: 'Exports' },
]

/** Barre d'onglets du module « Finance » — gabarit EquipeTabs. */
export function FinanceTabs() {
  const pathname = usePathname()
  return (
    <div className="mb-5 flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
      {TABS.map((t) => {
        const active =
          t.href === '/admin/finance' ? pathname === t.href : pathname.startsWith(t.href)
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
