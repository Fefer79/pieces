import { EquipeTabs } from '@/components/equipe/equipe-tabs'

export default function EquipeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 font-display text-2xl text-ink">Équipe &amp; commissions</h1>
      <EquipeTabs />
      {children}
    </div>
  )
}
