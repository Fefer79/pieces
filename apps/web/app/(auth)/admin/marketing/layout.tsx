import { MarketingTabs } from '@/components/marketing/marketing-tabs'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 font-display text-2xl text-ink">Marketing</h1>
      <MarketingTabs />
      {children}
    </div>
  )
}
