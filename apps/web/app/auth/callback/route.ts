import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase-middleware'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const returnTo = searchParams.get('returnTo') || '/browse'

  if (code) {
    const { supabase, response } = createSupabaseMiddlewareClient(request)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const redirectUrl = new URL(returnTo, request.url)
      // Copy cookies from the supabase response to the redirect response
      const redirect = NextResponse.redirect(redirectUrl)
      for (const cookie of response.cookies.getAll()) {
        redirect.cookies.set(cookie.name, cookie.value, cookie)
      }
      return redirect
    }
  }

  // If code exchange failed or no code, redirect to login
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('error', 'auth_failed')
  return NextResponse.redirect(loginUrl)
}
