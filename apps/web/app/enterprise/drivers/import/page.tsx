'use client'
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { enterpriseFetch, getActiveEnterpriseId } from '@/lib/enterprise-api'

type ImportResult = {
  created: number
  errors: { line: number; message: string }[]
}

export default function DriverImportPage() {
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setEnterpriseId(getActiveEnterpriseId()) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!enterpriseId || !file) return
    setSubmitting(true)
    setError(null)
    setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await enterpriseFetch<ImportResult>(`/${enterpriseId}/drivers/import`, {
      method: 'POST', body: fd,
    })
    setSubmitting(false)
    if (!res.ok) { setError(res.message); return }
    setResult(res.data)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/enterprise/drivers" className="text-sm text-muted hover:underline">← Chauffeurs</Link>
        <h1 className="mt-2 font-display text-3xl text-ink">Importer des chauffeurs</h1>
        <p className="mt-1 text-sm text-muted">Téléversez un fichier Excel (.xlsx) ou CSV pour créer plusieurs chauffeurs d'un coup.</p>
      </div>

      <div className="mb-6 rounded-md border border-ink-2/20 bg-ink-2/5 p-5">
        <h2 className="mb-1 font-display text-lg text-ink">Modèle Excel</h2>
        <p className="text-sm text-muted">
          Téléchargez la fiche d'onboarding, remplissez l'onglet « Chauffeurs », puis importez-la ici.
        </p>
        <a
          href="/modele-onboarding-flotte.xlsx"
          download
          className="mt-3 inline-block rounded-md border border-ink-2 px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-ink-2 hover:text-white"
        >
          ↓ Télécharger le modèle (.xlsx)
        </a>
      </div>

      <div className="mb-6 rounded-md border border-border bg-card p-5">
        <h2 className="mb-2 font-display text-lg text-ink">Format CSV (alternative)</h2>
        <p className="text-sm text-muted">
          Première ligne : en-têtes. Colonnes obligatoires : <code className="rounded-sm bg-surface px-1.5 py-0.5">nom</code>,{' '}
          <code className="rounded-sm bg-surface px-1.5 py-0.5">téléphone</code> (format +225XXXXXXXXXX).
          Colonnes optionnelles : <code className="rounded-sm bg-surface px-1.5 py-0.5">permis</code>,{' '}
          <code className="rounded-sm bg-surface px-1.5 py-0.5">catégorie</code>,{' '}
          <code className="rounded-sm bg-surface px-1.5 py-0.5">embauche</code> (JJ/MM/AAAA),{' '}
          <code className="rounded-sm bg-surface px-1.5 py-0.5">notes</code>.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-sm bg-surface p-3 text-xs text-ink">
{`nom,telephone,permis,categorie,embauche
Koffi Yao,+2250700000000,CI-123456,B,15/03/2022
Awa Traoré,+2250555000000,CI-789012,C,01/06/2023`}
        </pre>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-md border border-border bg-card p-5">
        <input
          type="file"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-ink file:mr-4 file:rounded-md file:border-0 file:bg-ink-2 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <button
          type="submit"
          disabled={!file || submitting}
          className="rounded-md bg-ink-2 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50"
        >
          {submitting ? 'Import en cours…' : 'Importer'}
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-lg text-ink">Résultat</h2>
          <p className="mt-2 text-sm text-ink">
            <span className="font-semibold tabular">{result.created}</span> chauffeur{result.created > 1 ? 's' : ''} créé{result.created > 1 ? 's' : ''}.
          </p>
          {result.errors.length > 0 && (
            <div className="mt-4">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                {result.errors.length} ligne{result.errors.length > 1 ? 's' : ''} ignorée{result.errors.length > 1 ? 's' : ''}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                {result.errors.map((err, i) => (
                  <li key={i} className="font-mono text-xs">{err.line > 0 ? `Ligne ${err.line}: ` : ''}{err.message}</li>
                ))}
              </ul>
            </div>
          )}
          {result.created > 0 && (
            <Link href="/enterprise/drivers" className="mt-4 inline-block text-sm font-semibold text-ink-2 hover:underline">
              Voir les chauffeurs →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
