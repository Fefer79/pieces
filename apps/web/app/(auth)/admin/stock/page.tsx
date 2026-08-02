'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  stockFetch,
  fmtFcfa,
  type StockLevel,
  type StockLevelList,
  type StockLocation,
  type StockLocationType,
  type StockOverview,
  type VendorStockAlertList,
} from '@/lib/stock-api'
import { LEVEL_STATUS_LABELS, levelStatusVariant, LOCATION_TYPE_LABELS } from '@/lib/stock-utils'
import { StatCard } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

export default function StockInventairePage() {
  const [overview, setOverview] = useState<StockOverview | null>(null)
  const [locations, setLocations] = useState<StockLocation[]>([])
  const [levels, setLevels] = useState<StockLevelList | null>(null)
  const [alerts, setAlerts] = useState<VendorStockAlertList | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [locationId, setLocationId] = useState('')
  const [statut, setStatut] = useState('')
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [page, setPage] = useState(1)

  const [adjusting, setAdjusting] = useState<StockLevel | null>(null)
  const [showLocationForm, setShowLocationForm] = useState(false)

  const loadOverview = useCallback(() => {
    stockFetch<StockOverview>('/overview').then((res) => {
      if (res.ok) setOverview(res.data)
    })
  }, [])

  const loadLocations = useCallback(() => {
    stockFetch<StockLocation[]>('/locations').then((res) => {
      if (res.ok) setLocations(res.data)
    })
  }, [])

  const loadLevels = useCallback(() => {
    const params = new URLSearchParams()
    if (locationId) params.set('locationId', locationId)
    if (statut) params.set('statut', statut)
    if (qDebounced) params.set('q', qDebounced)
    params.set('page', String(page))
    stockFetch<StockLevelList>(`/levels?${params}`).then((res) => {
      if (res.ok) {
        setLevels(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [locationId, statut, qDebounced, page])

  const loadAlerts = useCallback(() => {
    stockFetch<VendorStockAlertList>('/vendor-alerts?limit=10').then((res) => {
      if (res.ok) setAlerts(res.data)
    })
  }, [])

  // Recherche débouncée : évite un appel par frappe.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setQDebounced(q.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [q])

  useEffect(() => {
    loadOverview()
    loadLocations()
    loadAlerts()
  }, [loadOverview, loadLocations, loadAlerts])

  useEffect(() => {
    loadLevels()
  }, [loadLevels])

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Emplacements actifs" value={overview?.emplacementsActifs ?? '…'} />
        <StatCard label="Références suivies" value={overview?.referencesSuivies ?? '…'} />
        <StatCard label="Ruptures" value={overview?.ruptures ?? '…'} />
        <StatCard label="Stock bas" value={overview?.stockBas ?? '…'} />
        <StatCard
          label="Valeur du stock"
          value={overview ? fmtFcfa(overview.valeurStockFcfa) : '…'}
        />
        <StatCard label="Mouvements 30 j" value={overview?.mouvements30j ?? '…'} />
        <StatCard label="Fournisseurs actifs" value={overview?.fournisseursActifs ?? '…'} />
        <StatCard label="BC en cours" value={overview?.bcEnCours ?? '…'} />
      </div>

      {locations.length === 0 ? (
        <LocationFormCard
          title="Aucun emplacement — créez l’emplacement par défaut"
          onCreated={() => {
            setShowLocationForm(false)
            loadLocations()
            loadOverview()
          }}
        />
      ) : (
        showLocationForm && (
          <LocationFormCard
            title="Nouvel emplacement"
            onClose={() => setShowLocationForm(false)}
            onCreated={() => {
              setShowLocationForm(false)
              loadLocations()
              loadOverview()
            }}
          />
        )
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={locationId}
          onChange={(e) => {
            setPage(1)
            setLocationId(e.target.value)
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">Tous les emplacements</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nom}
            </option>
          ))}
        </select>
        <select
          value={statut}
          onChange={(e) => {
            setPage(1)
            setStatut(e.target.value)
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="rupture">Rupture</option>
          <option value="bas">Stock bas</option>
          <option value="ok">OK</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (nom, référence OEM)…"
          className="min-w-[180px] flex-1 rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <button
          onClick={() => setShowLocationForm(true)}
          className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card"
        >
          + Emplacement
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {!levels ? (
        <div className="text-sm text-muted">Chargement…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Pièce</Th>
                  <Th>Emplacement</Th>
                  <Th align="right">Quantité</Th>
                  <Th align="right">Seuil</Th>
                  <Th align="right">CUMP</Th>
                  <Th align="right">Valeur</Th>
                  <Th>Statut</Th>
                  <Th align="right"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {levels.levels.map((l) => (
                  <Tr key={l.id}>
                    <Td>
                      <Link
                        href={`/admin/catalog/${l.catalogItem.id}`}
                        className="font-medium text-ink hover:text-accent hover:underline"
                      >
                        {l.catalogItem.name ?? '—'}
                      </Link>
                      {l.catalogItem.oemReference && (
                        <div className="font-mono text-xs text-muted">
                          Réf. {l.catalogItem.oemReference}
                        </div>
                      )}
                    </Td>
                    <Td className="text-sm">
                      {l.location.nom}
                      <span className="ml-1 text-xs text-muted-2">
                        {LOCATION_TYPE_LABELS[l.location.type] ?? l.location.type}
                      </span>
                    </Td>
                    <Td num>{l.qtyOnHand}</Td>
                    <Td num>{l.seuilBas}</Td>
                    <Td num>{l.cumpFcfa != null ? fmtFcfa(l.cumpFcfa) : '—'}</Td>
                    <Td num>{l.valeurFcfa != null ? fmtFcfa(l.valeurFcfa) : '—'}</Td>
                    <Td>
                      <Chip variant={levelStatusVariant(l.statut)}>
                        {LEVEL_STATUS_LABELS[l.statut]}
                      </Chip>
                    </Td>
                    <Td align="right">
                      <button
                        onClick={() => setAdjusting(l)}
                        className="rounded-sm border border-border-strong px-2 py-1 text-[11px] font-medium hover:bg-surface"
                      >
                        Ajuster ±
                      </button>
                    </Td>
                  </Tr>
                ))}
                {levels.levels.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={8} align="center" className="py-6 text-muted">
                      Aucun niveau de stock. Créez un emplacement puis faites un premier ajustement.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>
              {levels.total} niveaux · page {levels.page}/
              {Math.max(1, Math.ceil(levels.total / levels.limit))}
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
                disabled={page >= Math.ceil(levels.total / levels.limit)}
                onClick={() => setPage(page + 1)}
                className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        </>
      )}

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg text-ink">Alertes vendeurs</h2>
        {!alerts ? (
          <div className="text-sm text-muted">Chargement…</div>
        ) : alerts.alerts.length === 0 ? (
          <p className="text-sm text-muted">Aucune fiche vendeur en rupture ou sous le seuil.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Statut</Th>
                  <Th>Pièce</Th>
                  <Th>Vendeur</Th>
                  <Th align="right">Stock</Th>
                  <Th align="right">Seuil</Th>
                </Tr>
              </Thead>
              <Tbody>
                {alerts.alerts.map((a) => (
                  <Tr key={a.id}>
                    <Td>
                      <Chip variant={a.type === 'rupture' ? 'status-err' : 'status-warn'}>
                        {a.type === 'rupture' ? 'Rupture' : 'Stock bas'}
                      </Chip>
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/catalog/${a.id}`}
                        className="font-medium text-ink hover:text-accent hover:underline"
                      >
                        {a.name ?? '—'}
                      </Link>
                      {a.oemReference && (
                        <div className="font-mono text-xs text-muted">Réf. {a.oemReference}</div>
                      )}
                    </Td>
                    <Td className="text-sm">
                      <Link
                        href={`/admin/vendors/${a.vendor.id}`}
                        className="text-ink-2 hover:underline"
                      >
                        {a.vendor.shopName}
                      </Link>
                      {a.vendor.isInternal && (
                        <span className="ml-1 text-[10px] text-muted-2">Stock interne</span>
                      )}
                    </Td>
                    <Td num>{a.stockQuantity}</Td>
                    <Td num>{a.lowStockThreshold}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
        {alerts && alerts.total > alerts.alerts.length && (
          <p className="mt-2 text-xs text-muted">
            {alerts.alerts.length} alertes affichées sur {alerts.total}.
          </p>
        )}
      </div>

      {adjusting && (
        <AdjustDialog
          level={adjusting}
          onClose={() => setAdjusting(null)}
          onAdjusted={() => {
            setAdjusting(null)
            loadLevels()
            loadOverview()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Création d'emplacement (inline)
// ---------------------------------------------------------------------------

function LocationFormCard({
  title,
  onCreated,
  onClose,
}: {
  title: string
  onCreated: () => void
  onClose?: () => void
}) {
  const [nom, setNom] = useState('')
  const [type, setType] = useState<StockLocationType>('ENTREPOT')
  const [commune, setCommune] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim() || busy) return
    setBusy(true)
    setError(null)
    const res = await stockFetch('/locations', {
      method: 'POST',
      body: JSON.stringify({ nom: nom.trim(), type, commune: commune.trim() || null }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    onCreated()
  }

  return (
    <div className="mb-4 rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          {title}
        </h2>
        {onClose && (
          <button onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        )}
      </div>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom (ex. Entrepôt Treichville)"
          className="min-w-[200px] flex-1 rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as StockLocationType)}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
          aria-label="Type d’emplacement"
        >
          {(Object.keys(LOCATION_TYPE_LABELS) as StockLocationType[]).map((t) => (
            <option key={t} value={t}>
              {LOCATION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <input
          value={commune}
          onChange={(e) => setCommune(e.target.value)}
          placeholder="Commune (optionnel)"
          className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || nom.trim().length < 2}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
        >
          {busy ? 'Création…' : 'Créer'}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-error-fg">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ajustement ± d'un niveau (dialog)
// ---------------------------------------------------------------------------

function AdjustDialog({
  level,
  onClose,
  onAdjusted,
}: {
  level: StockLevel
  onClose: () => void
  onAdjusted: () => void
}) {
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [cout, setCout] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deltaNum = Number.parseInt(delta, 10)
  const deltaValid = Number.isInteger(deltaNum) && deltaNum !== 0
  const projete = level.qtyOnHand + (deltaValid ? deltaNum : 0)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!deltaValid || busy) return
    setBusy(true)
    setError(null)
    const coutNum = Number.parseInt(cout, 10)
    const res = await stockFetch('/adjustments', {
      method: 'POST',
      body: JSON.stringify({
        catalogItemId: level.catalogItemId,
        locationId: level.locationId,
        delta: deltaNum,
        coutUnitaireFcfa: deltaNum > 0 && Number.isInteger(coutNum) ? coutNum : null,
        note: note.trim() || null,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    onAdjusted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Ajuster le stock</h2>
          <button onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <p className="mb-3 text-sm text-muted">
          {level.catalogItem.name ?? 'Pièce'} · {level.location.nom} · solde actuel{' '}
          <span className="font-mono text-ink">{level.qtyOnHand}</span>
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDelta(String((deltaValid ? deltaNum : 0) - 1))}
              className="h-9 w-9 rounded-sm border border-border-strong text-lg hover:bg-surface"
              aria-label="Retirer 1"
            >
              −
            </button>
            <input
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              inputMode="numeric"
              placeholder="Delta (ex. -2 ou 10)"
              className="min-w-0 flex-1 rounded-sm border border-border-strong bg-surface px-3 py-2 text-center font-mono text-sm"
              aria-label="Delta de quantité"
            />
            <button
              type="button"
              onClick={() => setDelta(String((deltaValid ? deltaNum : 0) + 1))}
              className="h-9 w-9 rounded-sm border border-border-strong text-lg hover:bg-surface"
              aria-label="Ajouter 1"
            >
              +
            </button>
          </div>
          {deltaValid && (
            <p className={`text-xs ${projete < 0 ? 'text-error-fg' : 'text-muted'}`}>
              Solde projeté : <span className="font-mono">{projete}</span>
              {projete < 0 && ' — le serveur refusera un solde négatif'}
            </p>
          )}
          {deltaValid && deltaNum > 0 && (
            <input
              value={cout}
              onChange={(e) => setCout(e.target.value)}
              inputMode="numeric"
              placeholder="Coût unitaire FCFA (optionnel, recalcule le CUMP)"
              className="w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
              aria-label="Coût unitaire"
            />
          )}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motif (inventaire, casse, correction…)"
            className="w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-error-fg">{error}</p>}
          <button
            type="submit"
            disabled={busy || !deltaValid || projete < 0}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? 'Enregistrement…' : 'Valider l’ajustement'}
          </button>
        </form>
      </div>
    </div>
  )
}
