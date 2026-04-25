'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { liaisonFetch } from '@/lib/liaison-api'

interface Dashboard {
  vendors: { total: number; active: number; pending: number }
  parts: { total: number; published: number; draft: number; archived: number }
}

export default function LiaisonDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    liaisonFetch<Dashboard>('/dashboard').then((r) => {
      if (r.ok) setData(r.data)
      else setError(r.message)
      setLoading(false)
    })
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-2xl text-ink">Tableau de bord Liaison</h1>
        <p className="mt-1 text-sm text-muted">
          Suivez vos vendeurs onboardés et leurs pièces publiées.
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-md border border-border bg-card p-3 text-sm text-[#D32F2F]">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-muted">Chargement…</p>}

      {data && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Stat label="Vendeurs" value={data.vendors.total} sub={`${data.vendors.active} actifs`} />
            <Stat label="En attente" value={data.vendors.pending} sub="signature garanties" />
            <Stat label="Pièces saisies" value={data.parts.total} sub={`${data.parts.published} publiées`} />
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/liaison/vendors/new"
              className="rounded-md bg-accent px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ minHeight: 48 }}
            >
              + Onboarder un vendeur
            </Link>
            <Link
              href="/liaison/vendors"
              className="rounded-md bg-card px-4 py-3 text-center text-sm font-medium text-ink ring-1 ring-border transition-colors hover:bg-surface"
              style={{ minHeight: 48 }}
            >
              Mes vendeurs
            </Link>
          </section>

          <section className="mt-6 flex justify-end">
            <Link
              href="/liaison/parts"
              className="text-sm font-medium text-ink-2 hover:underline"
            >
              Voir toutes mes pièces saisies →
            </Link>
          </section>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </div>
  )
}
