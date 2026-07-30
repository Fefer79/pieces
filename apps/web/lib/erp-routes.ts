// Table de routage du sous-domaine erp.pieces.ci — ERP/CRM interne.
//
// Ce fichier est importé par le middleware (runtime Edge) : data + chaînes
// uniquement, aucun import `next/*`, aucune API Node.
//
// ⚠ Choix INVERSE de celui de logistique.pieces.ci, et c'est volontaire.
//
// La vitrine logistique expose une liste BLANCHE de slugs, parce qu'elle est
// publique et qu'il faut garantir que `/login`, `/contact` et `/enterprise/*`
// restent joignables sur cet hôte.
//
// L'ERP n'a aucune page publique et comptera des dizaines d'écrans. Maintenir
// une liste blanche de 40 slugs serait une source de bugs (page livrée, slug
// oublié → 404 silencieux). On réécrit donc TOUT vers `/erp/*`, sauf une liste
// NOIRE courte et stable : les chemins d'authentification et les pages légales,
// qui doivent rester atteignables pour pouvoir se connecter à l'ERP.

export const ERP_PREFIX = '/erp'

/**
 * Chemins servis tels quels sur erp.pieces.ci (pas de réécriture).
 *
 * `/login` et `/auth/callback` sont indispensables : sans eux on ne peut pas
 * s'authentifier depuis le sous-domaine. Les pages légales suivent parce
 * qu'elles sont liées depuis les écrans de connexion.
 */
export const ERP_PASSTHROUGH = [
  '/login',
  '/logout',
  '/auth',
  '/oauth',
  '/cgu',
  '/confidentialite',
  '/forgot-password',
  '/reset-password',
] as const

export function isErpHost(host: string | null | undefined): boolean {
  if (!host) return false
  const hostname = (host.split(':')[0] ?? '').toLowerCase()
  return hostname.startsWith('erp.')
}

/** Vrai pour les chemins qui échappent à la réécriture ERP. */
export function isErpPassthrough(pathname: string): boolean {
  return ERP_PASSTHROUGH.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

/**
 * `/` → `/erp` · `/crm/pipeline` → `/erp/crm/pipeline`.
 *
 * Idempotent : un chemin déjà préfixé n'est pas préfixé deux fois. C'est ce qui
 * permet à `pieces.ci/erp/...` et `erp.pieces.ci/...` de coexister — pratique
 * en développement, où les sous-domaines locaux sont pénibles, et pour les
 * liens croisés depuis /admin.
 */
export function toErpInternalPath(pathname: string): string {
  if (pathname === '/') return ERP_PREFIX
  if (pathname === ERP_PREFIX || pathname.startsWith(`${ERP_PREFIX}/`)) return pathname
  return `${ERP_PREFIX}${pathname}`
}

/**
 * Vrai pour les chemins qui doivent échapper à l'AppShell.
 *
 * ⚠ `usePathname()` renvoie l'URL du navigateur, pas le chemin réécrit : sur le
 * sous-domaine il vaut `/taches`, pas `/erp/taches`. Côté client on ne peut donc
 * pas se fier au seul préfixe. L'ERP portant sa propre coquille (comme /admin),
 * cette fonction sert à l'exclure des layouts partagés.
 */
export function isErpSurface(pathname: string): boolean {
  return pathname === ERP_PREFIX || pathname.startsWith(`${ERP_PREFIX}/`)
}
