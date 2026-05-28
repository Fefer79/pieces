import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

const config: NextConfig = {
  transpilePackages: ['shared'],
  eslint: {
    // Lint via `pnpm lint`, not as part of `next build`. Avoids React 19 compiler
    // rules blocking deploys on patterns the team has not yet migrated.
    ignoreDuringBuilds: true,
  },
  // Inline NEXT_PUBLIC_* with hardcoded fallbacks so Cloudflare builds get them
  // even when the dashboard build env isn't wired through. Local dev still
  // overrides via .env.local (process.env populated before next.config runs).
  // Supabase anon key is public by design (RLS protects data).
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pieces.ci',
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://rlhkjgdpynjrfsveweuq.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsaGtqZ2RweW5qcmZzdmV3ZXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzMwNjksImV4cCI6MjA4NzkwOTA2OX0.IICYtpt-gODiNw_ySSyg-hhScWJl2P-yRIx_GI0fAFo',
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001'
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}

export default withSerwist(config)
