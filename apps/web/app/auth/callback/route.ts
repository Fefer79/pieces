import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/browse'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  // After successful exchange, check if user has a role
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    try {
      const profileRes = await fetch(`${origin}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (profileRes.ok) {
        const body = await profileRes.json()
        if (!body.data?.activeContext) {
          return NextResponse.redirect(`${origin}/onboarding/role`)
        }
      }
    } catch {
      // ignore — fall through to default redirect
    }
  }

  return response
}
