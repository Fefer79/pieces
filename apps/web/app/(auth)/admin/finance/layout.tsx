import { FinanceTabs } from '@/components/finance/finance-tabs'

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 font-display text-2xl text-ink">Finance</h1>
      <FinanceTabs />
      {children}
    </div>
  )
}
