import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authCookieDomain } from './cookie-domain'

// Singleton browser client. Creating a fresh client per component/layout spins
// up multiple GoTrueClient instances on the same auth-token storage key, which
// fight over the refresh lock and trigger a refresh-token storm → 429 from
// Supabase. Keep exactly one instance per tab.
let browserClient: SupabaseClient | null = null

export function createClient() {
  if (browserClient) return browserClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  const host = typeof window !== 'undefined' ? window.location.host : undefined

  browserClient = createBrowserClient(supabaseUrl, anonKey, {
    cookieOptions: { domain: authCookieDomain(host) },
  })

  return browserClient
}
