'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin-api'

interface LiaisonRow {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  roles: string[]
  activeContext: string | null
  createdAt: string
  stats: {
    vendors: number
    parts: number
    activities: number
    pendingAcceptance: number
  }
}

export default function AdminLiaisonsPage() {
  const [data, setData] = useState<LiaisonRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<LiaisonRow[]>('/admin/liaisons').then(setData).catch((e) => setError(e.message))
  }, [])

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-1 font-display text-2xl text-ink">Liaisons</h1>
      <p className="mb-4 text-sm text-muted">
        Vue d&apos;ensemble des utilisateurs avec le rôle LIAISON et leur activité.
      </p>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {!data ? (
        <div className="text-sm text-muted">Chargement…</div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Rôles</th>
                <th className="px-3 py-2 text-right">Vendeurs</th>
                <th className="px-3 py-2 text-right">Pièces</th>
                <th className="px-3 py-2 text-right">À agréer</th>
                <th className="px-3 py-2 text-right">Actions log</th>
              </tr>
            </thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link href={`/admin/liaisons/${l.id}`} className="text-ink-2 hover:underline">
                      {l.name ?? '(sans nom)'}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {l.phone ?? '—'}
                    {l.email ? ` · ${l.email}` : ''}
                  </td>
                  <td className="px-3 py-2 text-xs">{l.roles.join(', ')}</td>
                  <td className="px-3 py-2 text-right font-mono">{l.stats.vendors}</td>
                  <td className="px-3 py-2 text-right font-mono">{l.stats.parts}</td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${
                      l.stats.pendingAcceptance > 0 ? 'text-accent font-semibold' : ''
                    }`}
                  >
                    {l.stats.pendingAcceptance}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{l.stats.activities}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-muted">
                    Aucun Liaison.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
