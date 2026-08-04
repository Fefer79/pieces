// Table de routage du sous-domaine erp.pieces.ci — console ERP/CRM interne.
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
// une liste blanche de quarante slugs serait une source de bugs (écran livré,
// slug oublié → 404 silencieux). On réécrit donc TOUT vers `/erp/*`, sauf une
// liste NOIRE courte et stable.

export const ERP_PREFIX = '/erp'

/**
 * Chemins servis tels quels sur erp.pieces.ci (pas de réécriture).
 *
 * `/login` et `/auth/callback` sont indispensables : sans eux on ne peut pas
 * s'authentifier depuis le sous-domaine. Les pages légales suivent parce
 * qu'elles sont liées depuis les écrans de connexion.
 *
 * ⚠ `/admin` est dans cette liste et c'est le cœur du lot 1 : la console ERP
 *    référence les dix-neuf modules existants à leur nouvelle place dans les
 *    sections. Sans passe-droit, un clic sur « Prospection » deviendrait
 *    `/erp/admin/prospection` — une 404. Les modules migreront sous `/erp/*`
 *    aux lots suivants ; l'entrée disparaîtra alors d'elle-même.
 */
export const ERP_PASSTHROUGH = [
  '/admin',
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
 * `/` → `/erp` · `/parametres/equipe` → `/erp/parametres/equipe`.
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

// Pas d'équivalent à `isLogistiqueSurface` ici : `app/erp/` est hors du groupe
// `(public)`, donc l'AppShell ne l'enveloppe jamais. La console porte sa propre
// coquille (components/erp/erp-shell.tsx), comme /admin.
