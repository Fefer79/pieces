'use client'

export default function EnterpriseMembersPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Entreprise
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Membres</h1>
          <p className="mt-1 text-sm text-muted">
            Gérez les mécaniciens et employés de votre entreprise.
          </p>
        </div>
        <div className="group relative">
          <button
            disabled
            className="rounded-md bg-ink-2 px-4 py-2.5 text-sm font-semibold text-white opacity-50"
          >
            Inviter un membre
          </button>
          <div className="pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap rounded-sm bg-ink px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            Bientôt disponible
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
              <th className="px-6 py-3 text-left">Nom</th>
              <th className="px-6 py-3 text-left">Rôle</th>
              <th className="px-6 py-3 text-left">Téléphone</th>
              <th className="px-6 py-3 text-left">Statut</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted">
                Aucun membre pour le moment. Invitez des mécaniciens pour commencer.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
