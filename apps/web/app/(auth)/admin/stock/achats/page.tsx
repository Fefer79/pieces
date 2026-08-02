'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  stockFetch,
  fmtFcfa,
  type LandedCost,
  type PurchaseOrderDetail,
  type PurchaseOrderList,
  type PurchaseOrderMode,
  type PurchaseOrderStatus,
  type StockLocation,
  type SupplierList,
  type Supplier,
} from '@/lib/stock-api'
import {
  formatShortDate,
  isImportMode,
  PO_MODES,
  PO_STATUS_LABELS,
  poModeLabel,
  poStatusVariant,
  computePoAmount,
  computePoWeight,
} from '@/lib/stock-utils'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { SupplierPicker, type PickedSupplier } from '@/components/stock/supplier-picker'
import { CatalogItemPicker, type PickedCatalogItem } from '@/components/catalog-item-picker'

export default function StockAchatsPage() {
  const [data, setData] = useState<PurchaseOrderList | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [locations, setLocations] = useState<StockLocation[]>([])
  const [error, setError] = useState<string | null>(null)

  const [statut, setStatut] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (statut) params.set('statut', statut)
    if (supplierId) params.set('supplierId', supplierId)
    params.set('page', String(page))
    stockFetch<PurchaseOrderList>(`/purchase-orders?${params}`).then((res) => {
      if (res.ok) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [statut, supplierId, page])

  useEffect(() => {
    stockFetch<SupplierList>('/suppliers?limit=200').then((res) => {
      if (res.ok) setSuppliers(res.data.suppliers)
    })
    stockFetch<StockLocation[]>('/locations').then((res) => {
      if (res.ok) setLocations(res.data)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <select
            value={statut}
            onChange={(e) => {
              setPage(1)
              setStatut(e.target.value)
            }}
            className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
          >
            <option value="">Tous les statuts</option>
            {(Object.keys(PO_STATUS_LABELS) as PurchaseOrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {PO_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={supplierId}
            onChange={(e) => {
              setPage(1)
              setSupplierId(e.target.value)
            }}
            className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
          >
            <option value="">Tous les fournisseurs</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card"
        >
          {showCreate ? 'Fermer' : '+ Nouveau bon de commande'}
        </button>
      </div>

      {showCreate && (
        <CreatePoCard
          locations={locations}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            load()
          }}
        />
      )}

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {!data ? (
        <div className="text-sm text-muted">Chargement…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Numéro</Th>
                  <Th>Fournisseur</Th>
                  <Th>Statut</Th>
                  <Th>Mode</Th>
                  <Th align="right">Lignes</Th>
                  <Th align="right">Montant estimé</Th>
                  <Th>ETA</Th>
                  <Th>Créé le</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.purchaseOrders.map((po) => (
                  <Tr key={po.id}>
                    <Td>
                      <Link
                        href={`/admin/stock/achats/${po.id}`}
                        className="font-mono font-medium text-ink hover:text-accent hover:underline"
                      >
                        {po.numero}
                      </Link>
                    </Td>
                    <Td className="text-sm">{po.supplier?.nom ?? '—'}</Td>
                    <Td>
                      <Chip variant={poStatusVariant(po.statut)}>
                        {PO_STATUS_LABELS[po.statut]}
                      </Chip>
                    </Td>
                    <Td className="text-sm">{poModeLabel(po.mode)}</Td>
                    <Td num>{po._count?.lines ?? '—'}</Td>
                    <Td num>
                      {po.montantEstimeFcfa != null ? fmtFcfa(po.montantEstimeFcfa) : '—'}
                    </Td>
                    <Td className="text-xs text-muted">{formatShortDate(po.etaAt)}</Td>
                    <Td className="text-xs text-muted">{formatShortDate(po.createdAt)}</Td>
                  </Tr>
                ))}
                {data.purchaseOrders.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={8} align="center" className="py-6 text-muted">
                      Aucun bon de commande.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>
              {data.total} bons · page {data.page}/{Math.max(1, Math.ceil(data.total / data.limit))}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40"
              >
                ←
              </button>
              <button
                disabled={page >= Math.ceil(data.total / data.limit)}
                onClick={() => setPage(page + 1)}
                className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Création d'un bon de commande
// ---------------------------------------------------------------------------

interface DraftLine {
  item: PickedCatalogItem | null
  designation: string
  quantite: string
  prixUnitaire: string
  poidsEstimeKg: string
}

const emptyLine = (): DraftLine => ({
  item: null,
  designation: '',
  quantite: '1',
  prixUnitaire: '',
  poidsEstimeKg: '',
})

function CreatePoCard({
  locations,
  onClose,
  onCreated,
}: {
  locations: StockLocation[]
  onClose: () => void
  onCreated: () => void
}) {
  const router = useRouter()
  const [supplier, setSupplier] = useState<PickedSupplier | null>(null)
  const [mode, setMode] = useState<PurchaseOrderMode>('LOCAL')
  const [destinationId, setDestinationId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()])
  const [estimate, setEstimate] = useState<LandedCost | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Totaux dérivés des lignes saisies (prix en FCFA, taux = 1 côté serveur).
  const parsedLines = lines.map((l) => ({
    quantite: Number.parseInt(l.quantite, 10) || 0,
    prixUnitaire: Number.parseFloat(l.prixUnitaire.replace(',', '.')) || 0,
    poidsEstimeKg: Number.parseFloat(l.poidsEstimeKg.replace(',', '.')) || null,
  }))
  const montant = computePoAmount(parsedLines)
  const poids = computePoWeight(parsedLines)

  // Encadré coût d'import : ré-estimé (débouncé) quand mode/poids/lignes changent.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (montant <= 0) {
        setEstimate(null)
        return
      }
      stockFetch<LandedCost>('/purchase-orders/estimate', {
        method: 'POST',
        body: JSON.stringify({ mode, poidsTotalKg: poids, montantFcfa: Math.round(montant) }),
      }).then((res) => {
        if (res.ok) setEstimate(res.data)
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [mode, montant, poids])

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  const linesValid = lines.every((l, i) => {
    const p = parsedLines[i]!
    return (
      (l.item != null || l.designation.trim().length >= 2) &&
      p.quantite >= 1 &&
      p.prixUnitaire >= 0 &&
      l.prixUnitaire.trim() !== ''
    )
  })
  const canSubmit = supplier != null && lines.length >= 1 && linesValid && !busy

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !supplier) return
    setBusy(true)
    setError(null)
    const res = await stockFetch<PurchaseOrderDetail>('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        supplierId: supplier.id,
        destinationId: destinationId || null,
        mode,
        notes: notes.trim() || null,
        lines: lines.map((l, i) => {
          const p = parsedLines[i]!
          return {
            catalogItemId: l.item?.id ?? null,
            designation: l.item ? (l.item.name ?? l.designation.trim()) : l.designation.trim(),
            oemReference: l.item?.oemReference ?? null,
            quantite: p.quantite,
            prixUnitaire: p.prixUnitaire,
            poidsEstimeKg: p.poidsEstimeKg,
          }
        }),
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    onCreated()
    router.push(`/admin/stock/achats/${res.data.id}`)
  }

  return (
    <div className="mb-5 rounded-md border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Nouveau bon de commande
        </h2>
        <button onClick={onClose} className="text-muted hover:text-ink">
          ✕
        </button>
      </div>
      <form onSubmit={submit} className="space-y-4 p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <SupplierPicker value={supplier} onChange={setSupplier} required />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                Mode logistique
              </span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as PurchaseOrderMode)}
                className="w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
              >
                {PO_MODES.map((m) => (
                  <option key={m} value={m}>
                    {poModeLabel(m)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                Destination
              </span>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
              >
                <option value="">Aucune (pas d’impact stock)</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
            Lignes ({lines.length})
          </span>
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="rounded-md border border-border p-3">
                <div className="grid gap-3 lg:grid-cols-[1fr_90px_130px_110px_36px]">
                  <div>
                    {line.item ? (
                      <CatalogItemPicker
                        value={line.item}
                        onChange={(item) => updateLine(i, { item })}
                        label={`Ligne ${i + 1} — fiche catalogue`}
                      />
                    ) : (
                      <div className="space-y-2">
                        <CatalogItemPicker
                          value={null}
                          onChange={(item) => updateLine(i, { item })}
                          label={`Ligne ${i + 1} — fiche catalogue (optionnel)`}
                        />
                        <input
                          value={line.designation}
                          onChange={(e) => updateLine(i, { designation: e.target.value })}
                          placeholder="Ou désignation libre (ex. Plaquettes Corolla 2015)"
                          className="w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                      Qté
                    </span>
                    <input
                      value={line.quantite}
                      onChange={(e) => updateLine(i, { quantite: e.target.value })}
                      inputMode="numeric"
                      className="w-full rounded-sm border border-border bg-white px-2 py-2 text-center font-mono text-sm"
                      aria-label="Quantité"
                    />
                  </div>
                  <div>
                    <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                      Prix unit. FCFA
                    </span>
                    <input
                      value={line.prixUnitaire}
                      onChange={(e) => updateLine(i, { prixUnitaire: e.target.value })}
                      inputMode="decimal"
                      placeholder="0"
                      className="w-full rounded-sm border border-border bg-white px-2 py-2 text-right font-mono text-sm"
                      aria-label="Prix unitaire FCFA"
                    />
                  </div>
                  <div>
                    <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                      Poids/kg
                    </span>
                    <input
                      value={line.poidsEstimeKg}
                      onChange={(e) => updateLine(i, { poidsEstimeKg: e.target.value })}
                      inputMode="decimal"
                      placeholder={isImportMode(mode) ? 'requis' : 'optionnel'}
                      className="w-full rounded-sm border border-border bg-white px-2 py-2 text-right font-mono text-sm"
                      aria-label="Poids estimé en kg"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                      disabled={lines.length <= 1}
                      className="h-9 w-9 rounded-sm border border-border-strong text-muted hover:bg-surface disabled:opacity-40"
                      aria-label="Supprimer la ligne"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
            className="mt-2 rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-surface"
          >
            + Ajouter une ligne
          </button>
        </div>

        {montant > 0 && (
          <div className="rounded-md border border-border bg-surface p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Coût rendu entrepôt — {poModeLabel(mode)}
              {isImportMode(mode) && ` · poids estimé ${poids.toLocaleString('fr-FR')} kg`}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              <EstimateRow label="Marchandise" value={fmtFcfa(Math.round(montant))} />
              <EstimateRow label="Fret" value={estimate ? fmtFcfa(estimate.fret) : '…'} />
              <EstimateRow
                label="Douane (20 %)"
                value={estimate ? fmtFcfa(estimate.douane) : '…'}
              />
              <EstimateRow label="Last-mile" value={estimate ? fmtFcfa(estimate.lastMile) : '…'} />
              <EstimateRow
                label="Délai estimé"
                value={estimate ? `${estimate.delaiJours} j` : '…'}
              />
              <EstimateRow
                label="Total rendu"
                value={estimate ? fmtFcfa(estimate.total) : '…'}
                strong
              />
            </dl>
          </div>
        )}

        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes internes (optionnel)"
          className="w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />

        {error && <p className="text-xs text-error-fg">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-border-strong px-4 py-2 text-sm hover:bg-surface"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? 'Création…' : 'Créer le bon (brouillon)'}
          </button>
        </div>
      </form>
    </div>
  )
}

function EstimateRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-mono tabular ${strong ? 'font-semibold text-ink' : 'text-ink'}`}>
        {value}
      </dd>
    </div>
  )
}
