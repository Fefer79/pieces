// Table de routage du sous-domaine mecanicien.pieces.ci.
//
// Ce fichier est importé par le middleware (runtime Edge) : data + chaînes
// uniquement, aucun import `next/*`, aucune API Node.
//
// Le sous-domaine sert un sous-ensemble EXPLICITE de l'app, réécrit depuis la
// racine : `mecanicien.pieces.ci/inscription` → `/mecaniciens/inscription`. On
// préfère une liste blanche à une réécriture `/*` pour qu'aucune route
// applicative ne soit masquée par accident — même discipline que
// logistique-routes.ts.
//
// ⚠ Ajouter une page à la vitrine = ajouter son slug ici.

export const MECANICIEN_PREFIX = '/mecaniciens'

/** Slugs exacts servis à la racine du sous-domaine. */
export const MECANICIEN_SLUGS = [
  '/',
  '/inscription',
  '/recommander',
  '/comment-ca-marche',
] as const

/** Préfixes dynamiques (profil d'un mécanicien par id). */
export const MECANICIEN_DYNAMIC_PREFIXES = ['/atelier/'] as const

export function isMecanicienHost(host: string | null | undefined): boolean {
  if (!host) return false
  const hostname = (host.split(':')[0] ?? '').toLowerCase()
  return hostname.startsWith('mecanicien.')
}

export function isMecanicienSlug(pathname: string): boolean {
  if ((MECANICIEN_SLUGS as readonly string[]).includes(pathname)) return true
  return MECANICIEN_DYNAMIC_PREFIXES.some(
    (prefix) => pathname.startsWith(prefix) && pathname.length > prefix.length,
  )
}

/** `/` → `/mecaniciens` · `/inscription` → `/mecaniciens/inscription`. */
export function toMecanicienInternalPath(pathname: string): string {
  return pathname === '/' ? MECANICIEN_PREFIX : `${MECANICIEN_PREFIX}${pathname}`
}

/**
 * Vrai pour les chemins qui doivent échapper à l'AppShell.
 *
 * ⚠ `usePathname()` renvoie l'URL du navigateur, pas le chemin réécrit : sur le
 * sous-domaine il vaut `/inscription`, pas `/mecaniciens/inscription`. Il faut
 * donc tester les deux formes — même piège que logistique-routes.ts.
 */
export function isMecanicienSurface(pathname: string): boolean {
  return pathname.startsWith(MECANICIEN_PREFIX) || isMecanicienSlug(pathname)
}
