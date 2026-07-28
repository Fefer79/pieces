// Domaine partagé pour les cookies d'auth Supabase. En posant `.pieces.ci`, une
// session ouverte sur pieces.ci reste valide sur flotte.pieces.ci (et tout futur
// sous-domaine *.pieces.ci). Hors prod (localhost, *.workers.dev), on retourne
// `undefined` pour que les cookies restent scopés à l'hôte courant.
export function authCookieDomain(host: string | null | undefined): string | undefined {
  if (!host) return undefined
  const hostname = host.split(':')[0] ?? ''
  return hostname === 'pieces.ci' || hostname.endsWith('.pieces.ci') ? '.pieces.ci' : undefined
}

/**
 * Hôte « principal » de l'authentification. Le cookie de session est partagé
 * entre pieces.ci et tous ses sous-domaines, mais les Web Locks qui sérialisent
 * le refresh sont scopés par origine : si deux origines gardent leur ticker de
 * refresh, elles se volent le même refresh token (à usage unique). Une seule
 * origine garde donc le ticker — les autres rafraîchissent à la demande.
 *
 * Tout sous-domaine ajouté (flotte., logistique., …) est automatiquement
 * secondaire : pas de liste à maintenir.
 */
export function isPrimaryAuthHost(host: string | null | undefined): boolean {
  if (!host) return true
  const hostname = (host.split(':')[0] ?? '').toLowerCase()
  return !(hostname.endsWith('.pieces.ci') && hostname !== 'www.pieces.ci')
}
