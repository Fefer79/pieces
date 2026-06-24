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

  return createBrowserClient(supabaseUrl, anonKey, {
    cookieOptions: { domain: authCookieDomain(host) },
  })
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
