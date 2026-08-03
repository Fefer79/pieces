/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Chip, ConditionChip, PartSourceChip } from '@/components/ui/chip'
import { ArbitrageTable } from '@/components/logistique/arbitrage-table'
import {
  sourcingFetch,
  shipmentFetch,
  fmtFcfa,
  CURRENCIES,
  MODE_LABELS,
  CHANNEL_LABELS,
  OFFER_STATUS_LABELS,
  offerIsComplete,
  type SourcingSearchDetail,
  type SourcingOffer,
  type SourcingOfferStatus,
  type SourcingMode,
  type OfferMatrix,
  type PartConditionCode,
  type PartSourceCode,
} from '@/lib/sourcing-api'

const STATUS_CHIP: Record<SourcingOfferStatus, 'plain' | 'oem' | 'status-ok' | 'status-warn'> = {
  CANDIDATE: 'plain',
  SHORTLISTED: 'status-ok',
  CONTACTED: 'oem',
  REJECTED: 'plain',
  ORDERED: 'status-ok',
}

const inputCls =
  'w-full rounded-sm border border-border-strong bg-card px-2 py-1 text-[13px] text-ink'

export default function AdminSourcingDetailPage() {
  const params = useParams<{ id: string }>()
  const [search, setSearch] = useState<SourcingSearchDetail | null>(null)
  const [matrix, setMatrix] = useState<OfferMatrix | null>(null)
  const [urls, setUrls] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await sourcingFetch<SourcingSearchDetail>(`/searches/${params.id}`)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setError(null)
    setSearch(res.data)
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  /**
   * Le geste central : on colle les liens des pages vendeur, un par ligne.
   * Aucun autre champ n'est requis — le reste se complète dans le tableau.
   */
  async function addUrls() {
    const list = urls
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean)
    if (list.length === 0) return

    setBusy(true)
    const res = await sourcingFetch<{ created: number; skipped: number; offers: SourcingOffer[] }>(
      `/searches/${params.id}/offers`,
      { method: 'POST', body: JSON.stringify({ urls: list }) },
    )
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setError(null)
    setUrls('')
    setFlash(
      `${res.data.created} offre${res.data.created > 1 ? 's' : ''} ajoutée${res.data.created > 1 ? 's' : ''}` +
        (res.data.skipped > 0 ? ` · ${res.data.skipped} lien${res.data.skipped > 1 ? 's' : ''} déjà présent${res.data.skipped > 1 ? 's' : ''}` : ''),
    )
    setSearch((s) => (s ? { ...s, offers: res.data.offers } : s))
  }

  async function patchOffer(id: string, patch: Record<string, unknown>) {
    const res = await sourcingFetch<SourcingOffer>(`/offers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      setError(res.message)
      return
    }
    setError(null)
    setSearch((s) =>
      s ? { ...s, offers: s.offers.map((o) => (o.id === id ? res.data : o)) } : s,
    )
    setMatrix(null) // la matrice est recalculée à la demande, pas devinée
  }

  async function removeOffer(id: string) {
    const res = await sourcingFetch(`/offers/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setError(res.message)
      return
    }
    setSearch((s) => (s ? { ...s, offers: s.offers.filter((o) => o.id !== id) } : s))
    setMatrix(null)
  }

  async function computeMatrix() {
    setBusy(true)
    const res = await sourcingFetch<OfferMatrix>(`/searches/${params.id}/matrix`)
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setError(null)
    setMatrix(res.data)
  }

  async function createPurchaseOrder(offerId: string) {
    setBusy(true)
    const res = await sourcingFetch<{ id: string; numero: string }>(
      `/offers/${offerId}/purchase-order`,
      { method: 'POST', body: JSON.stringify({}) },
    )
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setError(null)
    setFlash(`Bon de commande ${res.data.numero} créé.`)
    load()
  }

  async function createShipment(offer: SourcingOffer) {
    if (!offer.purchaseOrderId) return
    setBusy(true)
    const res = await shipmentFetch<{ id: string; reference: string }>('', {
      method: 'POST',
      body: JSON.stringify({
        purchaseOrderId: offer.purchaseOrderId,
        carrier: 'TRANSITAIRE',
        mode: offer.chosenMode ?? (offer.country === 'CI' ? 'LOCAL' : 'AIR_STANDARD'),
        ...(offer.country ? { originCountry: offer.country } : {}),
        ...(offer.city ? { originCity: offer.city } : {}),
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setFlash(`Expédition ${res.data.reference} créée.`)
  }

  if (error && !search) {
    return <div className="p-6 text-sm text-error-fg">{error}</div>
  }
  if (!search) {
    return <div className="p-6 text-sm text-muted">Chargement…</div>
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/sourcing" className="text-[13px] text-muted hover:underline">
            ← Sourcing
          </Link>
          <h1 className="mt-1 font-display text-2xl text-ink">{search.partName}</h1>
          <p className="mt-1 text-sm text-muted">
            {[search.vehicleBrand, search.vehicleModel, search.vehicleYear]
              .filter(Boolean)
              .join(' ') || 'Véhicule non précisé'}
            {search.oemReference && (
              <span className="ml-2 font-mono text-[12px]">OEM {search.oemReference}</span>
            )}
            {' · '}
            {search.quantity} pièce{search.quantity > 1 ? 's' : ''}
          </p>
        </div>
        {search.quoteRequest && (
          <Link
            href={`/admin/logistique/${search.quoteRequest.id}`}
            className="rounded-md border border-border-strong px-3 py-2 text-sm text-ink hover:bg-surface"
          >
            Cotation {search.quoteRequest.reference} →
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}
      {flash && (
        <div className="mb-3 rounded-md border border-success-fg/20 bg-success-bg p-3 text-sm text-success-fg">
          {flash}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Collage des liens — le point d'entrée du module                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-5 rounded-md border border-border bg-card p-5">
        <h2 className="font-display text-lg text-ink">Ajouter des offres</h2>
        <p className="mt-1 text-sm text-muted">
          Collez les liens des pages vendeur (eBay, AliExpress, PartSouq, RockAuto, Autodoc,
          distributeurs régionaux…), un par ligne. Vous compléterez prix et délai juste en dessous.
        </p>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          rows={4}
          placeholder={'https://www.ebay.de/itm/…\nhttps://partsouq.com/…'}
          className="mt-3 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 font-mono text-[12.5px] text-ink"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={addUrls}
            disabled={busy || urls.trim().length === 0}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? 'Ajout…' : 'Ajouter'}
          </button>
          <span className="text-xs text-muted">20 liens maximum par ajout.</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Offres                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-5 rounded-md border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
          <h2 className="font-display text-lg text-ink">
            Offres <span className="text-muted">({search.offers.length})</span>
          </h2>
          <button
            onClick={computeMatrix}
            disabled={busy || search.offers.length === 0}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-ink hover:bg-surface disabled:opacity-50"
          >
            Calculer la matrice
          </button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr hover={false}>
                <Th>Source</Th>
                <Th>Prix</Th>
                <Th>Pays</Th>
                <Th>Délai</Th>
                <Th>Poids</Th>
                <Th>État</Th>
                <Th>Mode</Th>
                <Th>Statut</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {search.offers.map((o) => (
                <OfferRow
                  key={o.id}
                  offer={o}
                  onPatch={(patch) => patchOffer(o.id, patch)}
                  onDelete={() => removeOffer(o.id)}
                  onOrder={() => createPurchaseOrder(o.id)}
                  onShip={() => createShipment(o)}
                  busy={busy}
                />
              ))}
              {search.offers.length === 0 && (
                <Tr hover={false}>
                  <Td colSpan={9} align="center" className="py-6 text-muted">
                    Aucune offre. Collez vos premiers liens ci-dessus.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Matrice d'arbitrage                                                 */}
      {/* ------------------------------------------------------------------ */}
      {matrix && (
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-lg text-ink">Matrice d&apos;arbitrage</h2>
          <p className="mt-1 text-sm text-muted">
            Coût total rendu Abidjan, revenu perdu pendant l&apos;immobilisation compris —{' '}
            <span className="tabular font-mono text-ink">
              {fmtFcfa(matrix.result.downtimeCostPerDay)}
            </span>{' '}
            par jour.
          </p>

          {!matrix.allPricesConfirmed && matrix.pricedCount > 0 && (
            <p className="mt-2 rounded-sm border border-warn-fg/20 bg-warn-bg px-3 py-2 text-[12.5px] text-warn-fg">
              Ces totaux reposent sur des prix relevés en ligne, non confirmés par les fournisseurs.
              Cochez « prix confirmé » sur une offre une fois le devis obtenu.
            </p>
          )}

          <div className="mt-4">
            <ArbitrageTable result={matrix.result} />
          </div>

          {matrix.ignoredOffers.length > 0 && (
            <div className="mt-3 text-[12.5px] text-muted">
              <span className="font-medium text-ink-2">Offres écartées du calcul :</span>{' '}
              {matrix.ignoredOffers.map((i, idx) => {
                const offer = search.offers.find((o) => o.id === i.id)
                return (
                  <span key={i.id}>
                    {idx > 0 && ' · '}
                    {offer?.sourceSite ?? i.id} ({i.reason.toLowerCase()})
                  </span>
                )
              })}
            </div>
          )}

          {matrix.pricedCount === 0 && (
            <p className="mt-3 text-[12.5px] text-muted">
              Aucune offre chiffrée : renseignez au moins un prix pour comparer.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Une ligne d'offre, éditable sur place. Une offre fraîchement collée n'a
 * qu'une URL : c'est normal, et la puce « à compléter » le dit plutôt que de
 * la faire passer pour cassée.
 */
function OfferRow({
  offer,
  onPatch,
  onDelete,
  onOrder,
  onShip,
  busy,
}: {
  offer: SourcingOffer
  onPatch: (patch: Record<string, unknown>) => void
  onDelete: () => void
  onOrder: () => void
  onShip: () => void
  busy: boolean
}) {
  const [price, setPrice] = useState(offer.priceAmount?.toString() ?? '')
  const [country, setCountry] = useState(offer.country ?? '')
  const [lead, setLead] = useState(offer.leadTimeDays?.toString() ?? '')
  const [weight, setWeight] = useState(offer.weightKg?.toString() ?? '')

  const ordered = offer.status === 'ORDERED'

  return (
    <Tr className="align-top">
      <Td>
        <a
          href={offer.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-ink hover:underline"
        >
          {offer.sourceSite} ↗
        </a>
        <div className="mt-0.5 text-[11px] text-muted">
          {offer.title ?? CHANNEL_LABELS[offer.channel]}
        </div>
        {offer.origin === 'AGENT' && (
          <Chip variant="oem" className="mt-1">
            trouvé auto — à vérifier
          </Chip>
        )}
        {!offerIsComplete(offer) && (
          <Chip variant="status-warn" className="mt-1">
            à compléter
          </Chip>
        )}
      </Td>

      <Td>
        <div className="flex items-center gap-1">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() =>
              onPatch({ priceAmount: price === '' ? null : Number(price) })
            }
            inputMode="decimal"
            placeholder="—"
            disabled={ordered}
            className={`${inputCls} w-20`}
          />
          <select
            value={offer.priceCurrency}
            onChange={(e) => onPatch({ priceCurrency: e.target.value })}
            disabled={ordered}
            className={`${inputCls} w-20`}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {offer.priceFcfa != null && (
          <div className="mt-1 tabular font-mono text-[11px] text-muted">
            {fmtFcfa(offer.priceFcfa)}
          </div>
        )}
        <label className="mt-1 flex items-center gap-1 text-[11px] text-muted">
          <input
            type="checkbox"
            checked={offer.priceConfirmed}
            onChange={(e) => onPatch({ priceConfirmed: e.target.checked })}
            disabled={ordered}
          />
          prix confirmé
        </label>
      </Td>

      <Td>
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
          onBlur={() => onPatch({ country: country || null })}
          placeholder="DE"
          disabled={ordered}
          className={`${inputCls} w-14 font-mono`}
        />
      </Td>

      <Td>
        <input
          value={lead}
          onChange={(e) => setLead(e.target.value)}
          onBlur={() => onPatch({ leadTimeDays: lead === '' ? null : Number(lead) })}
          inputMode="numeric"
          placeholder="j"
          disabled={ordered}
          className={`${inputCls} w-14`}
        />
      </Td>

      <Td>
        <input
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={() => onPatch({ weightKg: weight === '' ? null : Number(weight) })}
          inputMode="decimal"
          placeholder="kg"
          disabled={ordered}
          className={`${inputCls} w-16`}
        />
      </Td>

      {/* DESIGN.md : la condition est une chip colorée, jamais du gris. */}
      <Td>
        <div className="flex flex-col gap-1">
          {offer.condition && <ConditionChip condition={offer.condition} />}
          {offer.source && <PartSourceChip source={offer.source} />}
          <select
            value={offer.condition ?? ''}
            onChange={(e) => onPatch({ condition: e.target.value || null })}
            disabled={ordered}
            className={`${inputCls} w-28`}
          >
            <option value="">État…</option>
            {(['NEW', 'USED', 'REFURBISHED'] as PartConditionCode[]).map((c) => (
              <option key={c} value={c}>
                {c === 'NEW' ? 'Neuf' : c === 'USED' ? 'Occasion importée' : 'Ré-usiné'}
              </option>
            ))}
          </select>
          <select
            value={offer.source ?? ''}
            onChange={(e) => onPatch({ source: e.target.value || null })}
            disabled={ordered}
            className={`${inputCls} w-28`}
          >
            <option value="">Origine…</option>
            {(['OEM', 'AFTERMARKET', 'COMPATIBLE'] as PartSourceCode[]).map((s) => (
              <option key={s} value={s}>
                {s === 'OEM' ? 'OEM' : s === 'AFTERMARKET' ? 'Aftermarket' : 'Compatible'}
              </option>
            ))}
          </select>
        </div>
      </Td>

      <Td>
        <select
          value={offer.chosenMode ?? ''}
          onChange={(e) => onPatch({ chosenMode: e.target.value || null })}
          disabled={ordered}
          className={`${inputCls} w-36`}
        >
          <option value="">Automatique</option>
          {(Object.keys(MODE_LABELS) as SourcingMode[]).map((m) => (
            <option key={m} value={m}>
              {MODE_LABELS[m]}
            </option>
          ))}
        </select>
      </Td>

      <Td>
        <Chip variant={STATUS_CHIP[offer.status]}>{OFFER_STATUS_LABELS[offer.status]}</Chip>
      </Td>

      <Td>
        <div className="flex flex-col gap-1 text-[12px]">
          {!ordered && offer.status !== 'SHORTLISTED' && (
            <button
              onClick={() => onPatch({ status: 'SHORTLISTED' })}
              className="text-ink-2 hover:underline"
            >
              Retenir
            </button>
          )}
          {!ordered && offer.status !== 'REJECTED' && (
            <button
              onClick={() => onPatch({ status: 'REJECTED' })}
              className="text-muted hover:underline"
            >
              Écarter
            </button>
          )}
          {!ordered && (
            <button
              onClick={onOrder}
              disabled={busy || offer.priceAmount == null}
              className="text-ink-2 hover:underline disabled:opacity-40"
              title={offer.priceAmount == null ? 'Renseignez le prix d\'abord' : undefined}
            >
              Commander
            </button>
          )}
          {ordered && (
            <>
              <Link
                href={`/admin/stock/achats/${offer.purchaseOrderId}`}
                className="text-ink-2 hover:underline"
              >
                Voir le BC
              </Link>
              <button onClick={onShip} disabled={busy} className="text-ink-2 hover:underline">
                Expédier
              </button>
            </>
          )}
          {!ordered && (
            <button onClick={onDelete} className="text-error-fg hover:underline">
              Supprimer
            </button>
          )}
        </div>
      </Td>
    </Tr>
  )
}
