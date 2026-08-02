'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/marketing', label: 'Campagnes' },
  { href: '/admin/marketing/nouvelle', label: 'Nouvelle campagne' },
]

/** Barre d'onglets du module « Marketing » — gabarit EquipeTabs. */
export function MarketingTabs() {
  const pathname = usePathname()
  return (
    <div className="mb-5 flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
      {TABS.map((t) => {
        // La fiche [id] et la création restent sous leurs onglets respectifs ;
        // seule « Campagnes » exige l'égalité exacte pour ne pas absorber
        // /nouvelle.
        const active =
          t.href === '/admin/marketing'
            ? pathname === t.href ||
              (pathname.startsWith('/admin/marketing/') && pathname !== '/admin/marketing/nouvelle')
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
