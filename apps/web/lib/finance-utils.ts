// ---------------------------------------------------------------------------
// Périodes mensuelles 'YYYY-MM' — dupliquées d'equipe-utils.ts volontairement
// (convention du repo : ne pas coupler les modules ERP entre eux).
// ---------------------------------------------------------------------------

const MOIS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

/** Période courante au format 'YYYY-MM' (UTC, comme l'API). */
export function currentPeriode(now = new Date()): string {
  return now.toISOString().slice(0, 7)
}

/** '2026-08' → « août 2026 » ; retourne l'entrée telle quelle si mal formée. */
export function formatPeriode(periode: string): string {
  const [y, m] = periode.split('-').map(Number)
  const mois = MOIS_FR[(m ?? 0) - 1]
  if (!y || !mois) return periode
  return `${mois} ${y}`
}

/** Liste les N dernières périodes ('YYYY-MM'), la plus récente d'abord. */
export function recentPeriodes(count: number, from = new Date()): string[] {
  const [y0, m0] = currentPeriode(from).split('-').map(Number)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(y0 ?? 0, (m0 ?? 1) - 1 - i, 1))
    out.push(d.toISOString().slice(0, 7))
  }
  return out
}

// ---------------------------------------------------------------------------
// Variations vs période précédente (l'API renvoie null sans point de
// comparaison — jamais de « +∞ % » trompeur à l'écran).
// ---------------------------------------------------------------------------

/** 20 → « +20 % », −50 → « −50 % », 0 → « 0 % », null → « — ». */
export function formatVariation(n: number | null): string {
  if (n == null) return '—'
  if (n > 0) return `+${n} %`
  if (n < 0) return `−${Math.abs(n)} %`
  return '0 %'
}

/** Classe de token couleur pour une variation : vert / rouge / neutre. */
export function variationTone(n: number | null): string {
  if (n == null || n === 0) return 'text-muted'
  return n > 0 ? 'text-success-fg' : 'text-error-fg'
}
