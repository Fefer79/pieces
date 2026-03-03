'use client'

import { usePathname } from 'next/navigation'
import { AppShell } from '@/components/app-shell'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // /browse (exact) gets its own layout — no AppShell
  if (pathname === '/browse' || pathname === '/') {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}
