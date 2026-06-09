'use client'
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { enterpriseFetch, getActiveEnterpriseId } from '@/lib/enterprise-api'

type ImportErr = { line: number; message: string }
type YangoResult = {
  drivers: { created: number; errors: ImportErr[] }
  vehicles: { created: number; assigned?: number; errors: ImportErr[] }
}

function ErrorList({ errors }: { errors: ImportErr[] }) {
  if (errors.length === 0) return null
  return (
    <ul className="mt-2 space-y-1 text-sm text-red-700">
      {errors.map((err, i) => (
        <li key={i} className="font-mono text-xs">
          {err.line > 0 ? `Ligne ${err.line}: ` : ''}
          {err.message}
        </li>
      ))}
    </ul>
  )
}

export default function YangoImportPage() {
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<YangoResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setEnterpriseId(getActiveEnterpriseId())
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!enterpriseId || !file) return
    setSubmitting(true)
    setError(null)
    setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await enterpriseFetch<YangoResult>(`/${enterpriseId}/import/yango`, {
      method: 'POST',
      body: fd,
    })
    setSubmitting(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setResult(res.data)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/enterprise/drivers" className="text-sm text-muted hover:underline">
          ← Chauffeurs
        </Link>
        <h1 className="mt-2 font-display text-3xl text-ink">Importer depuis Yango</h1>
        <p className="mt-1 text-sm text-muted">
          Téléversez l'export conducteurs Yango tel quel. Un seul fichier crée vos chauffeurs, vos
          véhicules et les affecte automatiquement.
        </p>
      </div>

      <div className="mb-6 rounded-md border border-ink-2/20 bg-ink-2/5 p-5">
        <h2 className="mb-1 font-display text-lg text-ink">Comment ça marche</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>
            → Exportez vos conducteurs depuis le tableau de bord Yango (fichier{' '}
            <code className="rounded-sm bg-surface px-1.5 py-0.5">contractor_profiles…csv</code>).
          </li>
          <li>→ Importez-le ici sans le modifier (CSV séparé par « ; » ou Excel).</li>
          <li>
            → Chaque conducteur devient un chauffeur ; chaque plaque devient un véhicule (les plaques
            partagées ne sont créées qu'une fois) ; l'affectation chauffeur↔véhicule est automatique.
          </li>
          <li>
            → Colonnes lues : <code className="rounded-sm bg-surface px-1.5 py-0.5">Nom complet</code>,{' '}
            <code className="rounded-sm bg-surface px-1.5 py-0.5">Numéro de téléphone</code>,{' '}
            <code className="rounded-sm bg-surface px-1.5 py-0.5">Permis de conduire</code>,{' '}
            <code className="rounded-sm bg-surface px-1.5 py-0.5">Véhicule</code>,{' '}
            <code className="rounded-sm bg-surface px-1.5 py-0.5">plaque d'immatriculation</code>.
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          L'année du véhicule n'étant pas fournie par Yango, elle est fixée à <strong>2025</strong> et
          modifiable ensuite par véhicule.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-md border border-border bg-card p-5">
        <input
          type="file"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-ink file:mr-4 file:rounded-md file:border-0 file:bg-ink-2 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <button
          type="submit"
          disabled={!file || submitting}
          className="rounded-md bg-ink-2 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50"
        >
          {submitting ? 'Import en cours…' : 'Importer le fichier Yango'}
        </button>
      </form>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="font-display text-lg text-ink">Chauffeurs</h2>
            <p className="mt-2 text-sm text-ink">
              <span className="font-semibold tabular">{result.drivers.created}</span> chauffeur
              {result.drivers.created > 1 ? 's' : ''} créé{result.drivers.created > 1 ? 's' : ''}.
            </p>
            <ErrorList errors={result.drivers.errors} />
          </div>

          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="font-display text-lg text-ink">Véhicules</h2>
            <p className="mt-2 text-sm text-ink">
              <span className="font-semibold tabular">{result.vehicles.created}</span> véhicule
              {result.vehicles.created > 1 ? 's' : ''} créé{result.vehicles.created > 1 ? 's' : ''}
              {result.vehicles.assigned != null && (
                <>
                  {' '}
                  · <span className="font-semibold tabular">{result.vehicles.assigned}</span> affecté
                  {result.vehicles.assigned > 1 ? 's' : ''} à un chauffeur
                </>
              )}
              .
            </p>
            <ErrorList errors={result.vehicles.errors} />
          </div>

          <div className="flex gap-4">
            <Link href="/enterprise/drivers" className="text-sm font-semibold text-ink-2 hover:underline">
              Voir les chauffeurs →
            </Link>
            <Link href="/enterprise/vehicles" className="text-sm font-semibold text-ink-2 hover:underline">
              Voir les véhicules →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
