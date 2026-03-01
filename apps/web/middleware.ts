import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseMiddlewareClient } from './lib/supabase-middleware'

const PUBLIC_PATHS = ['/login', '/']

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith('/login/'),
  )

  if (!user && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|api).*)'],
}
