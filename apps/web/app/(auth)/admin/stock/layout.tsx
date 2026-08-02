import { StockTabs } from '@/components/stock/stock-tabs'

export default function StockLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 font-display text-2xl text-ink">Stock &amp; achats</h1>
      <StockTabs />
      {children}
    </div>
  )
}
