import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { authCookieDomain } from '@/lib/cookie-domain'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/browse'

  // Build response we'll mutate cookies on
  const response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookieOptions: { domain: authCookieDomain(request.headers.get('host')) },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // Try PKCE flow first (?code=xxx)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }
  // Fall back to token hash flow (?token_hash=xxx&type=email)
  else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'email' | 'magiclink' | 'recovery' | 'invite' | 'signup',
      token_hash: tokenHash,
    })
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }
  else {
    return NextResponse.redirect(`${origin}/login?error=missing_token`)
  }

  // Skip provisioning for password recovery flows
  if (next === '/reset-password' || type === 'recovery') {
    return response
  }

  // Provisionne la ligne User côté API (upsert dans requireAuth) dès le
  // callback. Plus de redirection vers un choix de rôle : tout le monde
  // démarre dans l'espace Achat, les autres espaces s'activent en contexte.
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    try {
      await fetch(`${origin}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
    } catch {
      // ignore — fall through to default redirect
    }
  }

  return response
}
