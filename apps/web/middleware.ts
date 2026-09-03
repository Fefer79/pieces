import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseMiddlewareClient } from './lib/supabase-middleware'
import {
  isLogistiqueHost,
  isLogistiqueSlug,
  toLogistiqueInternalPath,
} from './lib/logistique-routes'

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
    // Query string comprise : un onboarding vendeur prérempli depuis un entretien
    // de démarchage perdrait sinon tout son préremplissage à la reconnexion.
    loginUrl.searchParams.set('returnTo', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  const host = (request.headers.get('host') ?? '').split(':')[0] ?? ''

  // Sous-domaine logistique.pieces.ci : vitrine + parcours de cotation.
  //
  // ⚠ ORDRE : cette réécriture passe AVANT la redirection racine → dashboard.
  // Le cookie d'auth est scopé `.pieces.ci` (lib/cookie-domain.ts), donc tout
  // utilisateur Pièces déjà connecté serait sinon renvoyé vers /dashboard et ne
  // verrait jamais la page marketing. Contrairement à flotte.*, la vitrine
  // logistique est identique connecté ou non.
  if (isLogistiqueHost(host) && isLogistiqueSlug(request.nextUrl.pathname)) {
    return NextResponse.rewrite(
      new URL(toLogistiqueInternalPath(request.nextUrl.pathname), request.url),
    )
  }

  // Sous-domaine erp.pieces.ci : back-office interne. Il n'a pas de vitrine —
  // la racine mène au login puis directement au cockpit d'administration.
  //
  // ⚠ Doit passer AVANT la redirection racine → /dashboard : le cookie est
  // scopé `.pieces.ci`, donc un admin déjà connecté atterrirait sinon sur
  // l'espace Achat au lieu de /admin.
  if (host.startsWith('erp.') && request.nextUrl.pathname === '/') {
    if (!isAuthed) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('returnTo', '/admin')
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Sous-domaine flotte.pieces.ci : portail entreprise dédié.
  const isFlotte = host.startsWith('flotte.')

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
