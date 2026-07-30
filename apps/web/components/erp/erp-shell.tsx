'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { navForCapabilities, activeNavHref } from '@/lib/erp-nav'
import { STAFF_ROLE_LABELS, BUSINESS_UNIT_LABELS } from 'shared/constants'
import type { ErpMe } from '@/lib/erp-api'

// Coquille de l'ERP — sidebar navy + barre de titre.
//
// Comme /admin, l'ERP n'utilise pas l'AppShell : la densité d'un back-office et
// la navigation par capacité n'ont rien à voir avec l'app client. La structure
// est navy (DESIGN.md : le navy structure, l'orange reste rare).
//
// ⚠ Sur erp.pieces.ci, `usePathname()` renvoie l'URL du navigateur (`/taches`),
// pas le chemin réécrit (`/erp/taches`). On normalise donc avant de comparer,
// sinon aucune entrée ne serait jamais active sur le sous-domaine.

function toInternal(pathname: string): string {
  if (pathname === '/') return '/erp'
  if (pathname === '/erp' || pathname.startsWith('/erp/')) return pathname
  // Les liens croisés vers /admin restent tels quels.
  if (pathname.startsWith('/admin')) return pathname
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
            <div key={section.key} className="mb-3">
              <h4 className="px-2.5 pb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
                {section.label}
              </h4>
              {section.items.map((item) => {
                const isActive = active === item.href
                if (item.soon) {
                  return (
                    <span
                      key={item.href}
                      title="Écran livré dans une prochaine phase"
                      className="flex cursor-default items-center justify-between gap-2 rounded-md border-l-[3px] border-transparent px-2.5 py-2 text-[13.5px] text-white/30"
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
                    className={`flex items-center gap-3 rounded-md border-l-[3px] px-2.5 py-2.5 text-[13.5px] font-medium transition-colors ${
                      isActive
                        ? 'border-accent bg-white/[0.09] text-white'
                        : 'border-transparent text-white/72 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[12.5px] text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            ← Quitter l’ERP
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {/* Navigation mobile : un select, comme le back-office admin. */}
        <div className="border-b border-border bg-card px-4 py-2 lg:hidden">
          <label htmlFor="erp-nav-mobile" className="sr-only">
            Aller à une section
          </label>
          <select
            id="erp-nav-mobile"
            value={active ?? '/erp'}
            onChange={(e) => router.push(e.target.value)}
            className="w-full rounded-sm border border-border-strong bg-surface px-2 py-2 text-sm"
          >
            {allItems
              .filter((i) => !i.soon)
              .map((i) => (
                <option key={i.href} value={i.href}>
                  {i.label}
                </option>
              ))}
          </select>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-card px-6 py-5 lg:px-8">
          <div>
            {eyebrow && (
              <div className="mb-1 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
                {eyebrow}
              </div>
            )}
            <h1 className="font-display text-[28px] leading-tight text-ink">{title}</h1>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>

        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
