import { SupportTabs } from '@/components/support/support-tabs'

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 font-display text-2xl text-ink">Support &amp; SAV</h1>
      <SupportTabs />
      {children}
    </div>
  )
}
