import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

  // Skip role check for password recovery flows
  if (next === '/reset-password' || type === 'recovery') {
    return response
  }

  // After successful auth, check if user has a role
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    try {
      const profileRes = await fetch(`${origin}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (profileRes.ok) {
        const body = await profileRes.json()
        if (!body.data?.activeContext) {
          // We need to preserve the cookies set above, so build a new redirect
          const onboardingResponse = NextResponse.redirect(`${origin}/onboarding/role`)
          for (const cookie of response.cookies.getAll()) {
            onboardingResponse.cookies.set(cookie.name, cookie.value, cookie)
          }
          return onboardingResponse
        }
      }
    } catch {
      // ignore — fall through to default redirect
    }
  }

  return response
}
