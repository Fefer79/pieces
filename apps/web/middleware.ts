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
  '/driver',
]

export async function middleware(request: NextRequest) {
  // Prefetches App Router : chaque lien visible déclenchait un getUser() (donc
  // potentiellement un refresh du token, à usage unique) en parallèle → courses
  // sur la rotation et 429. On les laisse passer sans toucher à l'auth ; la
  // navigation réelle repasse par le middleware.
  if (
    request.headers.get('next-router-prefetch') !== null ||
    request.headers.get('purpose') === 'prefetch'
  ) {
    return NextResponse.next()
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // WhatsApp reverse-OTP session: presence of the cookie is enough to gate the
  // UX here; the token itself is validated API-side by requireAuth.
  const hasPiecesSession = !!request.cookies.get('pieces_session')?.value
  const isAuthed = !!user || hasPiecesSession

  const isProtectedPath = PROTECTED_PATHS.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(`${path}/`),
  )

  if (!isAuthed && isProtectedPath) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnTo', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Sous-domaine flotte.pieces.ci : portail entreprise dédié.
  const isFlotte = ((request.headers.get('host') ?? '').split(':')[0] ?? '').startsWith('flotte.')

  // Connecté : la racine renvoie au tableau de bord, pas à la landing marketing.
  // Sur flotte.*, c'est le tableau de bord entreprise.
  if (isAuthed && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(
      new URL(isFlotte ? '/enterprise/dashboard' : '/dashboard', request.url),
    )
  }

  // Non connecté sur flotte.* à la racine : page marketing entreprises.
  if (!isAuthed && isFlotte && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/entreprises', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons/|api|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|woff2?)$).*)',
  ],
}
