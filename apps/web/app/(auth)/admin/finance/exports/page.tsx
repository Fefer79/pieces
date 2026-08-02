'use client'

import { useState } from 'react'
import { downloadFinanceCsv } from '@/lib/finance-api'
import { currentPeriode, formatPeriode, recentPeriodes } from '@/lib/finance-utils'
import { Card } from '@/components/ui/card'

const PERIODES = recentPeriodes(12)

const EXPORTS = [
  {
    key: 'commandes',
    titre: 'Commandes',
    description:
      'Une ligne par commande terminée de la période : date, n° de commande, client, vendeur(s), montant, livraison, main-d’œuvre, commission plateforme et statut escrow.',
  },
  {
    key: 'commissions',
    titre: 'Commissions par vendeur',
    description:
      'Agrégat par vendeur sur les commandes terminées de la période : nombre de commandes, GMV et commissions — trié par commissions décroissantes.',
  },
  {
    key: 'escrow',
    titre: 'Mouvements escrow',
    description:
      'Transactions séquestre touchées par la période (bloquées, libérées ou remboursées) : date de blocage, commande, montant, statut, dates de libération et de remboursement.',
  },
] as const

export default function FinanceExportsPage() {
  const [periode, setPeriode] = useState(currentPeriode())
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function download(key: string) {
    if (busy) return
    setBusy(key)
    setError(null)
    setNotice(null)
    const filename = `${key}-${periode}.csv`
    const res = await downloadFinanceCsv(`/export/${key}?periode=${periode}`, filename)
    setBusy(null)
    if (!res.ok) {
      setError(res.message ?? 'Téléchargement impossible. Réessayez.')
      return
    }
    setNotice(`${filename} téléchargé.`)
  }

  return (
    <div>
      <div className="mb-4 rounded-md border border-border bg-surface p-4 text-[13px] leading-relaxed text-muted">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em]">
          Format des exports
        </span>
        <p className="mt-1">
          CSV prêts pour Excel : encodage UTF-8 avec BOM, séparateur <strong>« ; »</strong>,
          montants en FCFA entiers, dates au format AAAA-MM-JJ. Ils s’ouvrent directement dans
          Excel avec les accents corrects et les colonnes bien séparées.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          {PERIODES.map((p) => (
            <option key={p} value={p}>
              {formatPeriode(p)}
            </option>
          ))}
        </select>
      </div>

      {notice && (
        <div className="mb-3 rounded-md border border-success-fg/20 bg-success-bg p-3 text-sm text-success-fg">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {EXPORTS.map((x) => (
          <Card key={x.key} className="flex flex-col">
            <h2 className="mb-1 font-display text-lg text-ink">{x.titre}</h2>
            <p className="mb-4 flex-1 text-[13px] leading-relaxed text-muted">{x.description}</p>
            <button
              onClick={() => download(x.key)}
              disabled={busy != null}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
            >
              {busy === x.key ? 'Téléchargement…' : 'Télécharger le CSV'}
            </button>
          </Card>
        ))}
      </div>
    </div>
  )
}
