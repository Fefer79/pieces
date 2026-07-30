import type { ReactNode } from 'react'

// Cadre de graphique du back-office.
//
// Extrait de `app/(auth)/admin/finances/page.tsx`, où il était défini en local
// et recopié à chaque nouvel écran. Ajoute au passage l'action optionnelle en
// en-tête (sélecteur de période, export) et une légende de bas de cadre, les
// deux besoins qui revenaient dans chaque copie.

export function ChartCard({
  title,
  action,
  hint,
  children,
  className = '',
}: {
  title: string
  /** Contrôle aligné à droite du titre : sélecteur, bouton d'export. */
  action?: ReactNode
  /** Précision sous le graphique — méthode de calcul, unité, réserve. */
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-md border border-border bg-card p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          {title}
        </div>
        {action}
      </div>
      {children}
      {hint && <p className="mt-3 text-[12px] leading-snug text-muted">{hint}</p>}
    </div>
  )
}
