'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/support', label: 'Litiges' },
  { href: '/admin/support/retours', label: 'Retours' },
]

/** Barre d'onglets du module « Support & SAV » — gabarit EquipeTabs. */
export function SupportTabs() {
  const pathname = usePathname()
  return (
    <div className="mb-5 flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
      {TABS.map((t) => {
        // L'onglet Litiges couvre aussi la fiche /admin/support/litiges/[id] ;
        // l'onglet Retours couvre /admin/support/retours et sa fiche [id].
        const active =
          t.href === '/admin/support'
            ? pathname === t.href || pathname.startsWith('/admin/support/litiges')
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
