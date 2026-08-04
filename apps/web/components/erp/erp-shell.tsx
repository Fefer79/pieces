'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { navForCapabilities, activeNavHref } from '@/lib/erp-nav'
import { ErpSearch } from './erp-search'
import { erpFetch, type ErpMe, type ErpNavCounts } from '@/lib/erp-api'
import { STAFF_ROLE_LABELS, BUSINESS_UNIT_LABELS, ERP_BADGES } from 'shared/constants'

// Coquille de la console ERP — barre latérale navy + barre de titre.
//
// Comme /admin, l'ERP n'utilise pas l'AppShell : la densité d'un back-office et
// la navigation par capacité n'ont rien à voir avec l'app client. La structure
// est navy (DESIGN.md : le navy structure, l'orange reste rare — ici il ne sert
// qu'à l'entrée active et aux compteurs de retard).
//
// ⚠ Sur erp.pieces.ci, `usePathname()` renvoie l'URL du navigateur (`/erp` est
// masqué par la réécriture). On normalise donc avant de comparer, sinon aucune
// entrée ne serait jamais active sur le sous-domaine.

function toInternal(pathname: string): string {
  if (pathname === '/') return '/erp'
  if (pathname === '/erp' || pathname.startsWith('/erp/')) return pathname
  // Les liens croisés vers /admin sont servis tels quels (passe-droit).
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return pathname
  return `/erp${pathname}`
}

export function ErpShell({
  me,
  title,
  eyebrow,
  actions,
  children,
}: {
  me: ErpMe
  title: string
  /** Sur-titre mono uppercase au-dessus du titre. */
  eyebrow?: string
  actions?: ReactNode
  children: ReactNode
}) {
  const rawPathname = usePathname()
  const router = useRouter()
  const pathname = toInternal(rawPathname)
  const sections = navForCapabilities(me.capabilities)
  const active = activeNavHref(pathname)
  const [counts, setCounts] = useState<ErpNavCounts['counts']>({})

  // Compteurs de la navigation. Chargés une fois par montage de la coquille :
  // un rafraîchissement permanent transformerait la barre latérale en widget
  // temps réel, pour une information dont la fraîcheur à la minute n'apporte
  // rien.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await erpFetch<ErpNavCounts>('/nav-counts')
      if (cancelled || !res.ok) return
      setCounts(res.data.counts)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const displayName = me.user.name ?? me.user.phone ?? me.user.email ?? 'Équipe Pièces'
  const roleLabel = me.staffRole
    ? STAFF_ROLE_LABELS[me.staffRole]
    : me.isPlatformAdmin
      ? 'Administrateur'
      : '—'

  const allItems = sections.flatMap((s) => s.items)

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-60 shrink-0 flex-col bg-ink text-white lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/erp" className="font-display text-2xl text-white">
            Pièces<span className="text-accent">.</span>
          </Link>
        </div>

        {/* Bloc de contexte : qui je suis et sur quelles lignes d'activité. */}
        <div className="mx-3 mb-2 rounded-md bg-white/[0.06] px-3 py-2.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
            {roleLabel}
          </div>
          <div className="mt-0.5 truncate text-[13px] font-medium text-white">{displayName}</div>
          {me.businessUnits.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {me.businessUnits.map((bu) => (
                <span
                  key={bu}
                  className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/70"
                >
                  {BUSINESS_UNIT_LABELS[bu]}
                </span>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {sections.map((section) => (
            <div key={section.key} className="mb-1.5">
              <h4 className="px-2.5 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
                {section.label}
              </h4>
              {section.items.map((item) => {
                const count = item.badge ? counts[item.badge] : undefined
                const isActive = active === item.href

                if (item.soon) {
                  return (
                    <span
                      key={item.href}
                      title={`Écran prévu — ${item.lot}`}
                      className="flex cursor-not-allowed items-center justify-between gap-2 rounded-md border-l-[3px] border-transparent px-2.5 py-2 text-[13.5px] text-white/30"
                    >
                      {item.label}
                      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-white/25">
                        bientôt
                      </span>
                    </span>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between gap-2 rounded-md border-l-[3px] px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                      isActive
                        ? 'border-accent bg-white/[0.09] text-white'
                        : 'border-transparent text-white/72 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {count !== undefined && count > 0 && (
                      <span
                        title={item.badge ? ERP_BADGES[item.badge].hint : undefined}
                        className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] font-medium tabular text-white"
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 lg:px-6">
          <div className="min-w-0">
            {eyebrow && (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {eyebrow}
              </p>
            )}
            <h1 className="truncate font-display text-2xl text-ink">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ErpSearch />
            {actions}
          </div>
        </header>

        {/* Navigation repliée : la barre latérale disparaît sous lg. */}
        <div className="border-b border-border bg-card px-4 py-2 lg:hidden">
          <select
            value={active ?? ''}
            onChange={(e) => router.push(e.target.value)}
            className="w-full rounded-sm border border-border-strong bg-surface px-2 py-2 text-sm"
          >
            {active === null && <option value="">Aller à…</option>}
            {allItems
              .filter((i) => !i.soon)
              .map((i) => (
                <option key={i.href} value={i.href}>
                  {i.label}
                </option>
              ))}
          </select>
        </div>

        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}
