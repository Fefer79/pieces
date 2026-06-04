import { createBrowserClient } from '@supabase/ssr'
import { authCookieDomain } from './cookie-domain'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  const host = typeof window !== 'undefined' ? window.location.host : undefined

  return createBrowserClient(supabaseUrl, anonKey, {
    cookieOptions: { domain: authCookieDomain(host) },
  })
}
