'use client'

import Link from 'next/link'

const STAT_CARDS = [
  { label: 'Véhicules', value: '—', icon: VehicleIcon },
  { label: 'Mécaniciens', value: '—', icon: MechanicIcon },
  { label: 'Commandes actives', value: '—', icon: OrderIcon },
  { label: 'Dépenses du mois', value: '—', icon: ExpenseIcon },
] as const

export default function EnterpriseDashboardPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Entreprise
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted">Vue d&apos;ensemble de votre flotte et activité.</p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-md border border-border bg-card p-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[rgba(0,35,102,0.08)] text-ink-2">
              <Icon />
            </div>
            <div>
              <p className="font-display text-2xl text-ink tabular">{value}</p>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Onboarding message */}
      <div className="rounded-md border border-occasion-fg/20 bg-occasion-bg p-6 text-center">
        <h2 className="mb-2 font-display text-xl text-occasion-fg">
          Bienvenue sur votre espace entreprise
        </h2>
        <p className="mb-5 text-sm text-occasion-fg/85">
          Ajoutez des membres et des véhicules pour commencer à utiliser le tableau de bord.
        </p>
        <Link
          href="/enterprise/members"
          className="inline-flex items-center justify-center rounded-md bg-ink-2 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink"
        >
          Gérer les membres
        </Link>
      </div>
    </div>
  )
}

function VehicleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

function MechanicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function OrderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function ExpenseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  )
}
