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
