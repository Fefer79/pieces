import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { authCookieDomain } from './cookie-domain'

export function createSupabaseMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anonKey = process.env.SUPABASE_ANON_KEY ?? ''

  const supabase = createServerClient(
    supabaseUrl,
    anonKey,
    {
      cookieOptions: { domain: authCookieDomain(request.headers.get('host')) },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request: { headers: request.headers } })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  return { supabase, response }
}
