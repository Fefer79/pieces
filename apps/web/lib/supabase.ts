import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anonKey = process.env.SUPABASE_ANON_KEY ?? ''

  return createBrowserClient(supabaseUrl, anonKey)
}
