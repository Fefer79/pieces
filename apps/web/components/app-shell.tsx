'use client'

import { BottomNav } from './bottom-nav'
import { DesktopSidebar } from './desktop-sidebar'
import { AppTopbar } from './app-topbar'
import { SpaceGuard } from './space-guard'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden lg:block">
          <AppTopbar />
        </div>
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <SpaceGuard>{children}</SpaceGuard>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
