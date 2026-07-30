// Table de routage du sous-domaine logistique.pieces.ci.
//
// Ce fichier est importé par le middleware (runtime Edge) : data + chaînes
// uniquement, aucun import `next/*`, aucune API Node.
//
// Le sous-domaine sert un sous-ensemble EXPLICITE de l'app, réécrit depuis la
// racine : `logistique.pieces.ci/devis` → `/logistique/devis`. On préfère une
// liste blanche à une réécriture `/*` pour que `/login`, `/contact` et
// `/enterprise/*` restent joignables sur cet hôte et qu'aucune route applicative
// ne soit masquée par accident.
//
// ⚠ Ajouter une page à la vitrine = ajouter son slug ici.

export const LOGISTIQUE_PREFIX = '/logistique'

/** Slugs exacts servis à la racine du sous-domaine. */
export const LOGISTIQUE_SLUGS = [
  '/',
  '/flottes-vtc',
  '/devis',
  '/devis/merci',
  '/calculateur',
  '/comment-ca-marche',
  '/faq',
] as const

/** Préfixes dynamiques (suivi d'une cotation par référence). */
export const LOGISTIQUE_DYNAMIC_PREFIXES = ['/suivi/'] as const

export function isLogistiqueHost(host: string | null | undefined): boolean {
  if (!host) return false
  const hostname = (host.split(':')[0] ?? '').toLowerCase()
  return hostname.startsWith('logistique.')
}

export function isLogistiqueSlug(pathname: string): boolean {
  if ((LOGISTIQUE_SLUGS as readonly string[]).includes(pathname)) return true
  return LOGISTIQUE_DYNAMIC_PREFIXES.some(
    (prefix) => pathname.startsWith(prefix) && pathname.length > prefix.length,
  )
}

/** `/` → `/logistique` · `/devis` → `/logistique/devis`. */
export function toLogistiqueInternalPath(pathname: string): string {
  return pathname === '/' ? LOGISTIQUE_PREFIX : `${LOGISTIQUE_PREFIX}${pathname}`
}

/**
 * Vrai pour les chemins qui doivent échapper à l'AppShell.
 *
 * ⚠ `usePathname()` renvoie l'URL du navigateur, pas le chemin réécrit : sur le
 * sous-domaine il vaut `/devis`, pas `/logistique/devis`. Il faut donc tester
 * les deux formes — c'est exactement le piège que `pathname === '/'` contourne
 * déjà pour la vitrine flotte.
 */
export function isLogistiqueSurface(pathname: string): boolean {
  return pathname.startsWith(LOGISTIQUE_PREFIX) || isLogistiqueSlug(pathname)
}
