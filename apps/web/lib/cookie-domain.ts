// Domaine partagé pour les cookies d'auth Supabase. En posant `.pieces.ci`, une
// session ouverte sur pieces.ci reste valide sur flotte.pieces.ci (et tout futur
// sous-domaine *.pieces.ci). Hors prod (localhost, *.workers.dev), on retourne
// `undefined` pour que les cookies restent scopés à l'hôte courant.
export function authCookieDomain(host: string | null | undefined): string | undefined {
  if (!host) return undefined
  const hostname = host.split(':')[0] ?? ''
  return hostname === 'pieces.ci' || hostname.endsWith('.pieces.ci') ? '.pieces.ci' : undefined
}
