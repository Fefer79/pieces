'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  sourcingFetch,
  fmtFcfa,
  SEARCH_STATUS_LABELS,
  OFFER_STATUS_LABELS,
  CHANNEL_LABELS,
  MODE_LABELS,
  type OfferMatrix,
  type SourcingOffer,
  type SourcingSearchDetail,
} from '@/lib/sourcing-api'
import { SEARCH_STATUS_CHIP, OFFER_STATUS_CHIP, formatDelay } from '@/lib/sourcing-utils'
import { Chip, ConditionChip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const MODES = Object.keys(MODE_LABELS)

/** Prix source dans sa devise — sert de contrôle face au montant converti. */
function sourcePrice(offer: SourcingOffer): string {
  if (offer.priceAmount == null) return '—'
  return `${offer.priceAmount.toLocaleString('fr-FR')} ${offer.priceCurrency ?? ''}`.trim()
}

export default function AdminSourcingDetailPage() {
  const params = useParams<{ id: string }>()
  const [search, setSearch] = useState<SourcingSearchDetail | null>(null)
  const [matrix, setMatrix] = useState<OfferMatrix | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ message: string; whatsappUrl: string | null; mailtoUrl: string | null } | null>(
    null,
  )

  const load = useCallback(() => {
    sourcingFetch<SourcingSearchDetail>(`/searches/${params.id}`).then((res) => {
      if (res.ok) setSearch(res.data)
      else setError(res.message)
    })
  }, [params.id])

  const loadMatrix = useCallback(() => {
    sourcingFetch<OfferMatrix>(`/searches/${params.id}/matrix`).then((res) => {
      if (res.ok) setMatrix(res.data)
    })
  }, [params.id])

  useEffect(() => {
    load()
    loadMatrix()
  }, [load, loadMatrix])

  async function patchOffer(id: string, body: Record<string, unknown>) {
    setBusy(id)
    const res = await sourcingFetch(`/offers/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    setBusy(null)
    if (!res.ok) return setError(res.message)
    setError(null)
    load()
    loadMatrix()
  }

  async function generatePo(id: string) {
    setBusy(id)
    const res = await sourcingFetch<{ id: string; numero: string }>(`/offers/${id}/purchase-order`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    setBusy(null)
    if (!res.ok) return setError(res.message)
    setError(null)
    load()
  }

  async function requestDraft(id: string) {
    setBusy(id)
    const res = await sourcingFetch<{
      message: string
      whatsappUrl: string | null
      mailtoUrl: string | null
    }>(`/offers/${id}/message`, { method: 'POST' })
    setBusy(null)
    if (!res.ok) return setError(res.message)
    setError(null)
    setDraft(res.data)
  }

  if (error && !search) {
    return (
      <div className="rounded-md border border-error-fg/30 bg-error-bg/40 p-4 text-[13px] text-error-fg">
        {error}
      </div>
    )
  }
  if (!search) return <div className="text-muted">Chargement…</div>

  const vehicle = [search.vehicleBrand, search.vehicleModel, search.vehicleYear]
    .filter(Boolean)
    .join(' ')

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/sourcing" className="text-[13px] text-muted underline underline-offset-2">
            ← Toutes les recherches
          </Link>
          <h1 className="mt-1 font-display text-2xl text-ink">{search.partName}</h1>
          <p className="text-[13px] text-muted">
            {vehicle || 'Véhicule non précisé'}
            {search.oemReference && <> · réf. {search.oemReference}</>} · qté {search.quantity}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip variant={SEARCH_STATUS_CHIP[search.status]}>
            {SEARCH_STATUS_LABELS[search.status]}
          </Chip>
          {search.quoteRequest && (
            <Link
              href={`/admin/logistique/${search.quoteRequest.id}`}
              className="rounded-sm border border-border-strong px-3 py-1.5 text-[13px]"
            >
              Cotation {search.quoteRequest.reference}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/30 bg-error-bg/40 p-3 text-[13px] text-error-fg">
          {error}
        </div>
      )}

      {search.status === 'FAILED' && search.error && (
        <div className="mb-3 rounded-md border border-error-fg/30 bg-error-bg/40 p-3 text-[13px] text-error-fg">
          Recherche en échec : {search.error}
        </div>
      )}
      {(search.status === 'PENDING' || search.status === 'RUNNING') && (
        <div className="mb-3 rounded-md border border-warn-fg/30 bg-warn-bg/40 p-3 text-[13px] text-warn-fg">
          Recherche en cours (30 à 90 s). Rechargez la page dans un instant.
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Offres */}
      {/* ---------------------------------------------------------------- */}
      <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        Offres trouvées ({search.offers.length})
      </h2>

      <div className="mb-6 rounded-md border border-border bg-card">
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Fournisseur</Th>
              <Th>État</Th>
              <Th align="right">Prix source</Th>
              <Th align="right">Prix FCFA</Th>
              <Th align="right">Délai</Th>
              <Th>Mode</Th>
              <Th>Statut</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {search.offers.map((offer) => (
              <Tr key={offer.id}>
                <Td>
                  <div className="font-medium">
                    {offer.url ? (
                      <a
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        {offer.supplierName}
                      </a>
                    ) : (
                      offer.supplierName
                    )}
                  </div>
                  <div className="text-[11.5px] text-muted">
                    {CHANNEL_LABELS[offer.channel]}
                    {offer.country && <> · {offer.country}</>}
                  </div>
                  {offer.title && <div className="text-[11.5px] text-muted">{offer.title}</div>}
                </Td>
                <Td>
                  {/* DESIGN.md : la condition est une chip colorée, jamais du gris. */}
                  {offer.condition ? (
                    <ConditionChip condition={offer.condition} />
                  ) : offer.conditionLabel ? (
                    <Chip variant="aftermarket">{offer.conditionLabel}</Chip>
                  ) : (
                    <Chip variant="plain">Non précisé</Chip>
                  )}
                </Td>
                <Td num>{sourcePrice(offer)}</Td>
                <Td num>
                  {fmtFcfa(offer.priceFcfa)}
                  {offer.priceFcfa != null && !offer.priceConfirmed && (
                    <div className="mt-1">
                      <Chip variant="status-warn">à confirmer</Chip>
                    </div>
                  )}
                </Td>
                <Td num>{offer.leadTimeDays != null ? `${offer.leadTimeDays} j` : '—'}</Td>
                <Td>
                  <select
                    value={offer.chosenMode ?? ''}
                    disabled={offer.status === 'ORDERED'}
                    onChange={(e) =>
                      patchOffer(offer.id, { chosenMode: e.target.value || null })
                    }
                    className="rounded-sm border border-border-strong bg-card px-2 py-1 text-[12px] text-ink"
                  >
                    <option value="">Auto</option>
                    {MODES.map((m) => (
                      <option key={m} value={m}>
                        {MODE_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </Td>
                <Td>
                  <Chip variant={OFFER_STATUS_CHIP[offer.status]}>
                    {OFFER_STATUS_LABELS[offer.status]}
                  </Chip>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {offer.status !== 'ORDERED' && (
                      <>
                        <button
                          type="button"
                          disabled={busy === offer.id}
                          onClick={() =>
                            patchOffer(offer.id, {
                              status: offer.status === 'SHORTLISTED' ? 'CANDIDATE' : 'SHORTLISTED',
                            })
                          }
                          className="rounded-sm border border-border-strong px-2 py-1 text-[12px] disabled:opacity-40"
                        >
                          {offer.status === 'SHORTLISTED' ? 'Retirer' : 'Retenir'}
                        </button>
                        <button
                          type="button"
                          disabled={busy === offer.id}
                          onClick={() => patchOffer(offer.id, { status: 'REJECTED' })}
                          className="rounded-sm border border-border-strong px-2 py-1 text-[12px] disabled:opacity-40"
                        >
                          Écarter
                        </button>
                        {!offer.priceConfirmed && offer.priceAmount != null && (
                          <button
                            type="button"
                            disabled={busy === offer.id}
                            onClick={() => patchOffer(offer.id, { priceConfirmed: true })}
                            className="rounded-sm border border-border-strong px-2 py-1 text-[12px] disabled:opacity-40"
                          >
                            Confirmer le prix
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy === offer.id}
                          onClick={() => requestDraft(offer.id)}
                          className="rounded-sm border border-border-strong px-2 py-1 text-[12px] disabled:opacity-40"
                        >
                          Message
                        </button>
                        <button
                          type="button"
                          disabled={busy === offer.id || offer.priceAmount == null}
                          onClick={() => generatePo(offer.id)}
                          className="rounded-sm bg-ink px-2 py-1 text-[12px] text-card disabled:opacity-40"
                        >
                          Créer le BC
                        </button>
                      </>
                    )}
                    {offer.purchaseOrderId && (
                      <Link
                        href={`/admin/stock/achats/${offer.purchaseOrderId}`}
                        className="rounded-sm border border-border-strong px-2 py-1 text-[12px]"
                      >
                        Voir le BC
                      </Link>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
            {search.offers.length === 0 && (
              <Tr hover={false}>
                <Td colSpan={8}>
                  <span className="text-muted">Aucune offre pour cette recherche.</span>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </div>

      {draft && (
        <div className="mb-6 rounded-md border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Brouillon de message — rien n’est envoyé automatiquement
            </h3>
            <button type="button" onClick={() => setDraft(null)} className="text-[13px] text-muted">
              Fermer
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-sm border border-border bg-surface p-3 text-[13px] text-ink">
            {draft.message}
          </pre>
          <div className="mt-2 flex gap-2">
            {draft.whatsappUrl && (
              <a
                href={draft.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm border border-border-strong px-3 py-1.5 text-[13px]"
              >
                Ouvrir WhatsApp
              </a>
            )}
            {draft.mailtoUrl && (
              <a
                href={draft.mailtoUrl}
                className="rounded-sm border border-border-strong px-3 py-1.5 text-[13px]"
              >
                Ouvrir l’e-mail
              </a>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Matrice d'arbitrage */}
      {/* ---------------------------------------------------------------- */}
      <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        Arbitrage — coût rendu Abidjan
      </h2>

      {matrix && matrix.options.length > 0 ? (
        <>
          {matrix.allPricesUnconfirmed && (
            <div className="mb-2 rounded-md border border-warn-fg/30 bg-warn-bg/40 p-3 text-[13px] text-warn-fg">
              Aucun prix retenu n’est confirmé : cette matrice repose sur des prix relevés en ligne,
              à valider auprès des fournisseurs avant tout devis client.
            </div>
          )}
          <div className="rounded-md border border-border bg-card">
            {/* DESIGN.md : chaque poste de coût est montré, jamais agrégé en silence. */}
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Option</Th>
                  <Th>État</Th>
                  <Th align="right">Pièce</Th>
                  <Th align="right">Fret</Th>
                  <Th align="right">Douane</Th>
                  <Th align="right">Livraison</Th>
                  <Th align="right">Immobilisation</Th>
                  <Th align="right">Total</Th>
                </Tr>
              </Thead>
              <Tbody>
                {matrix.options.map((o, i) => (
                  <Tr key={`${o.mode}-${o.offerId ?? i}`}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{o.supplierName ?? o.label}</span>
                        {o.recommended && <Chip variant="status-ok">Recommandée</Chip>}
                      </div>
                      <div className="text-[11.5px] text-muted">
                        {o.label} · {formatDelay(o.transitDays)}
                        {o.extraCostVsBest > 0 && <> · +{fmtFcfa(o.extraCostVsBest)}</>}
                      </div>
                      {o.warnings.map((w) => (
                        <div key={w} className="text-[11.5px] text-warn-fg">
                          {w}
                        </div>
                      ))}
                    </Td>
                    <Td>
                      {o.condition ? (
                        <ConditionChip condition={o.condition} />
                      ) : o.conditionLabel ? (
                        <Chip variant="aftermarket">{o.conditionLabel}</Chip>
                      ) : (
                        <Chip variant="plain">Non précisé</Chip>
                      )}
                    </Td>
                    <Td num>
                      {fmtFcfa(o.partPrice)}
                      {!o.priceConfirmed && (
                        <div className="mt-1">
                          <Chip variant="status-warn">à confirmer</Chip>
                        </div>
                      )}
                    </Td>
                    <Td num>{fmtFcfa(o.freightCost)}</Td>
                    <Td num>{fmtFcfa(o.customsCost)}</Td>
                    <Td num>{fmtFcfa(o.lastMileCost)}</Td>
                    <Td num>{fmtFcfa(o.downtimeCost)}</Td>
                    <Td num className="font-semibold">
                      {fmtFcfa(o.totalCost)}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
          <p className="mt-2 text-[12px] text-muted">
            Immobilisation calculée à {fmtFcfa(matrix.downtimeCostPerDay)} par jour
            {matrix.matrix && <> · poids retenu {matrix.matrix.weightKg} kg ({matrix.matrix.familyLabel})</>}.
          </p>
        </>
      ) : (
        <p className="text-[13px] text-muted">
          Retenez au moins une offre avec un prix pour construire la matrice d’arbitrage.
        </p>
      )}
    </div>
  )
}
