// Client-side storage for the Pièces-native session token minted by the
// WhatsApp reverse-OTP login. Unlike Supabase sessions, this token has no SDK,
// so we persist it ourselves:
//   - localStorage  → read by auth-context.getAccessToken() for API calls
//   - cookie        → read by middleware to gate protected routes (UX only;
//                     real enforcement is API-side via requireAuth)
//
// Cookie domain mirrors lib/cookie-domain.ts so the session is shared across
// *.pieces.ci subdomains.

const STORAGE_KEY = 'pieces_session'
export const PIECES_SESSION_COOKIE = 'pieces_session'
const MAX_AGE_SEC = 30 * 24 * 60 * 60 // 30 days

function cookieDomain(hostname: string): string | undefined {
  return hostname === 'pieces.ci' || hostname.endsWith('.pieces.ci') ? '.pieces.ci' : undefined
}

export function setPiecesSession(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, token)

  const { hostname, protocol } = window.location
  const domain = cookieDomain(hostname)
  const parts = [
    `${PIECES_SESSION_COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${MAX_AGE_SEC}`,
    'SameSite=Lax',
  ]
  if (domain) parts.push(`Domain=${domain}`)
  if (protocol === 'https:') parts.push('Secure')
  document.cookie = parts.join('; ')
}

export function getPiecesSession(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

export function clearPiecesSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)

  const domain = cookieDomain(window.location.hostname)
  const parts = [`${PIECES_SESSION_COOKIE}=`, 'Path=/', 'Max-Age=0', 'SameSite=Lax']
  if (domain) parts.push(`Domain=${domain}`)
  document.cookie = parts.join('; ')
}
