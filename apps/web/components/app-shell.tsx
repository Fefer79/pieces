'use client'

import { BottomNav } from './bottom-nav'
import { DesktopSidebar } from './desktop-sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col">
        <div className="flex-1 pb-16 lg:pb-0">{children}</div>
        <BottomNav />
      </div>
    </div>
  )
}
