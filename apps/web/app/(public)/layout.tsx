'use client'

import { usePathname } from 'next/navigation'
import { AppShell } from '@/components/app-shell'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // /browse (exact) gets its own layout — no AppShell.
  // La vitrine flotte (/entreprises/*) a son propre chrome navy (voir entreprises/layout.tsx).
  if (
    pathname === '/browse' ||
    pathname === '/' ||
    pathname === '/info' ||
    pathname.startsWith('/entreprises')
  ) {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}
