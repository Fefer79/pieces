'use client'

import { useState } from 'react'
import { enterpriseFetch, type LogisticsMatrix } from '@/lib/enterprise-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const CATEGORY_LABEL: Record<string, string> = {
  ECONOMY_ICE: 'Économique thermique',
  PREMIUM_ICE: 'Premium thermique',
  PREMIUM_EV: 'Premium électrique',
}

const CONFIDENCE_LABEL: Record<string, string> = {
  MEASURED: 'poids réel mesuré',
  CATALOG: 'poids fiche fournisseur',
  FAMILY: 'estimation par famille, ± 20 %',
}

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} F`

const formatDelay = (days: number) =>
  days < 1 ? `${Math.round(days * 24)} h` : `${days} j`

const labelCls = 'block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'
const inputCls =
  'mt-1 w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink'

/**
 * Matrice d'arbitrage d'une demande de pièce : compare le coût TOTAL de chaque option
 * d'approvisionnement, immobilisation du véhicule comprise. Le tableau détaille chaque
 * poste — aucun coût n'est agrégé sans être montré (DESIGN.md).
 */
export function LogisticsMatrixCard({
  enterpriseId,
  requestId,
}: {
  enterpriseId: string
  requestId: string
}) {
  const [localPrice, setLocalPrice] = useState('')
  const [importPrice, setImportPrice] = useState('')
  const [prePositionedPrice, setPrePositionedPrice] = useState('')
  const [localAvailable, setLocalAvailable] = useState(true)
  const [matrix, setMatrix] = useState<LogisticsMatrix | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function compute() {
    setLoading(true)
    setError(null)
    const res = await enterpriseFetch<LogisticsMatrix>(
      `/${enterpriseId}/part-requests/${requestId}/logistics-matrix`,
      {
        method: 'POST',
        body: JSON.stringify({
          ...(localPrice && { localPrice: Number(localPrice) }),
          ...(importPrice && { importPrice: Number(importPrice) }),
          ...(prePositionedPrice && { prePositionedPrice: Number(prePositionedPrice) }),
          localAvailable,
        }),
      },
    )
    setLoading(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setMatrix(res.data)
  }

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <h2 className="font-display text-lg text-ink">Matrice d&apos;arbitrage</h2>
      <p className="mt-1 text-sm text-muted">
        Coût total de chaque option, revenu perdu pendant l&apos;immobilisation compris.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Prix local</label>
          <input
            type="number"
            inputMode="numeric"
            value={localPrice}
            onChange={(e) => setLocalPrice(e.target.value)}
            placeholder="FCFA"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Prix usine / import</label>
          <input
            type="number"
            inputMode="numeric"
            value={importPrice}
            onChange={(e) => setImportPrice(e.target.value)}
            placeholder="FCFA"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Prix stock pré-positionné</label>
          <input
            type="number"
            inputMode="numeric"
            value={prePositionedPrice}
            onChange={(e) => setPrePositionedPrice(e.target.value)}
            placeholder="Optionnel"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={localAvailable}
            onChange={(e) => setLocalAvailable(e.target.checked)}
          />
          Pièce disponible localement
        </label>
        <button
          onClick={compute}
          disabled={loading}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? 'Calcul…' : 'Calculer'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-error-fg">{error}</p>}

      {matrix && (
        <div className="mt-5">
          <p className="text-sm text-muted">
            {CATEGORY_LABEL[matrix.vehicle.category]} — immobilisation{' '}
            <strong className="text-ink">{fmt(matrix.downtimeCostPerDay)}/jour</strong>. Un jour
            gagné vaut donc {fmt(matrix.downtimeCostPerDay)} de transport.
          </p>
          <p className="mt-1 text-xs text-muted-2">
            {matrix.familyLabel} · {matrix.weightKg} kg · {matrix.volumeDm3} dm³ (
            {CONFIDENCE_LABEL[matrix.confidence]})
          </p>

          <div className="mt-3 overflow-x-auto rounded-md border border-border">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Option</Th>
                  <Th>Délai</Th>
                  <Th align="right">Pièce</Th>
                  <Th align="right">Fret</Th>
                  <Th align="right">Douane</Th>
                  <Th align="right">Livraison</Th>
                  <Th align="right">Immobilisation</Th>
                  <Th align="right">Coût total</Th>
                </Tr>
              </Thead>
              <Tbody>
                {matrix.options.map((o) => (
                  <Tr key={o.mode}>
                    <Td className={o.recommended ? 'font-semibold text-ink' : 'text-ink'}>
                      {o.label}
                      {o.recommended && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-700">
                          Recommandé
                        </span>
                      )}
                      {!o.available && (
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                          Indisponible
                        </span>
                      )}
                      <p className="text-[11px] text-muted-2">{o.detail}</p>
                      {o.warnings.map((w) => (
                        <p key={w} className="text-[11px] text-amber-700">
                          ⚠ {w}
                        </p>
                      ))}
                    </Td>
                    <Td className="text-ink">{formatDelay(o.transitDays)}</Td>
                    <Td align="right" className="tabular text-ink">{fmt(o.partPrice)}</Td>
                    <Td align="right" className="tabular text-muted">{fmt(o.freightCost)}</Td>
                    <Td align="right" className="tabular text-muted">{fmt(o.customsCost)}</Td>
                    <Td align="right" className="tabular text-muted">{fmt(o.lastMileCost)}</Td>
                    <Td align="right" className="tabular text-muted">{fmt(o.downtimeCost)}</Td>
                    <Td align="right" className={`tabular ${o.recommended ? 'font-semibold text-ink' : 'text-ink'}`}>
                      {fmt(o.totalCost)}
                      {o.extraCostVsBest > 0 && (
                        <p className="text-[11px] font-normal text-red-600">
                          +{fmt(o.extraCostVsBest)}
                        </p>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>

          <p className="mt-3 text-xs text-muted-2">
            Estimation de cadrage : les tarifs de fret et de douane sont des ordres de grandeur,
            confirmés par un devis ferme avant toute commande.
          </p>
        </div>
      )}
    </div>
  )
}
