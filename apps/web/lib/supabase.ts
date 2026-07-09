import { createBrowserClient } from '@supabase/ssr'
import { authCookieDomain } from './cookie-domain'

// Instance navigateur unique. Sans ce singleton, chaque appel à createClient()
// (31 sites) crée un GoTrueClient distinct avec son propre auto-refresh. Comme les
// refresh tokens Supabase sont à usage unique (rotation), plusieurs instances qui
// rafraîchissent en parallèle se volent le token : la 1re le consomme, les autres
// reçoivent `refresh_token_not_found` et réessaient en boucle → tempête de
// /token?grant_type=refresh_token → 429 « Request rate limit reached » (par IP),
// ce qui bloque aussi le login. cf. https://supabase.com/docs/guides/auth/server-side
function buildClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  const host = typeof window !== 'undefined' ? window.location.host : undefined

  const client = createBrowserClient(supabaseUrl, anonKey, {
    cookieOptions: { domain: authCookieDomain(host) },
  })

  // Le cookie de session est partagé entre pieces.ci et flotte.pieces.ci, mais
  // les Web Locks qui sérialisent les refresh sont scopés par origine : deux
  // onglets sur les deux domaines rafraîchissent le même token (à usage unique)
  // en parallèle et se le volent → boucle 400/429. Une seule origine
  // (pieces.ci) garde le ticker de refresh en arrière-plan ; sur flotte.* le
  // refresh reste possible à la demande (getSession() rafraîchit un token
  // expiré), seul le ticker est coupé. NB : @supabase/ssr force
  // autoRefreshToken:true côté navigateur, d'où la coupure après création.
  if (host?.startsWith('flotte.')) {
    ;(client.auth as unknown as { autoRefreshToken: boolean }).autoRefreshToken = false
    void client.auth.stopAutoRefresh()
  }

  return client
}

let browserClient: ReturnType<typeof buildClient> | undefined

export function createClient() {
  if (browserClient) return browserClient

  const instance = buildClient()

  // Ne mémoïser que côté navigateur : en SSR `window` est absent, on ne veut pas
  // figer une instance créée sans le bon host/cookies.
  if (typeof window !== 'undefined') browserClient = instance
  return instance
}
