import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseMiddlewareClient } from './lib/supabase-middleware'

const PROTECTED_PATHS = [
  '/dashboard',
  '/vehicles',
  '/orders',
  '/profile',
  '/vendors',
  '/rider',
  '/admin',
  '/onboarding',
  '/enterprise',
  '/liaison',
]

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtectedPath = PROTECTED_PATHS.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(`${path}/`),
  )

  if (!user && isProtectedPath) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnTo', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Sous-domaine flotte.pieces.ci : portail entreprise dédié.
  const isFlotte = ((request.headers.get('host') ?? '').split(':')[0] ?? '').startsWith('flotte.')

  // Connecté : la racine renvoie au tableau de bord, pas à la landing marketing.
  // Sur flotte.*, c'est le tableau de bord entreprise.
  if (user && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(
      new URL(isFlotte ? '/enterprise/dashboard' : '/dashboard', request.url),
    )
  }

  // Non connecté sur flotte.* à la racine : page marketing entreprises.
  if (!user && isFlotte && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/entreprises', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons/|.*\\.png$|api).*)'],
}
