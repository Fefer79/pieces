'use client'

export default function EnterpriseMembersPage() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-gray-900">Membres de l&apos;entreprise</h1>
          <p className="text-sm text-gray-500">Gérez les mécaniciens et employés de votre entreprise</p>
        </div>
        <div className="group relative">
          <button
            disabled
            className="rounded-lg bg-[#002366] px-4 py-2.5 text-sm font-medium text-white opacity-50"
          >
            Inviter un membre
          </button>
          <div className="pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Bientôt disponible
          </div>
        </div>
      </div>

      {/* Empty table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Rôle</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Téléphone</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                Aucun membre pour le moment. Invitez des mécaniciens pour commencer.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
