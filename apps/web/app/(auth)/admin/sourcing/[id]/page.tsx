'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  sourcingFetch,
  fmtFcfa,
  SEARCH_STATUS_LABEL,
  ORIGIN_LABEL,
  OFFER_STATUS_LABEL,
  CHANNEL_LABEL,
  type SourcingSearchDetail,
  type SourcingOffer,
  type SourcingOfferStatus,
  type OfferMatrix,
  type LogisticsMode,
} from '@/lib/sourcing-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Chip, ConditionChip, type ChipVariant } from '@/components/ui/chip'
import { OfferForm } from '@/components/logistique/offer-form'

const OFFER_CHIP: Record<SourcingOfferStatus, ChipVariant> = {
  CANDIDATE: 'plain',
  SHORTLISTED: 'status-ok',
  CONTACTED: 'oem',
  REJECTED: 'plain',
  ORDERED: 'status-ok',
}

const MODES: { key: LogisticsMode; label: string }[] = [
  { key: 'LOCAL', label: 'Achat local' },
  { key: 'AIR_NOW', label: 'Aérien express' },
  { key: 'AIR_STANDARD', label: 'Aérien standard' },
  { key: 'AIR_ECONOMY', label: 'Aérien économique' },
  { key: 'SEA_LCL', label: 'Maritime groupé' },
  { key: 'PRE_POSITIONED', label: 'Stock pré-positionné' },
]

const fmtDelay = (days: number) => (days < 1 ? `${Math.round(days * 24)} h` : `${days} j`)

const labelCls = 'font-mono text-[10px] uppercase tracking-[0.08em] text-muted'
const btnCls =
  'rounded-sm border border-border px-2.5 py-1 text-[12px] text-ink hover:bg-surface disabled:opacity-40'

/** Prix source dans sa devise + conversion FCFA. Le détail n'est jamais masqué (DESIGN.md). */
function OfferPrice({ offer }: { offer: SourcingOffer }) {
  if (offer.priceAmount == null) {
    return <span className="text-[12px] text-warn-fg">Prix à obtenir</span>
  }
  return (
    <div>
      <span className="tabular font-semibold text-ink">{fmtFcfa(offer.priceFcfa)}</span>
      <p className="font-mono text-[11px] text-muted-2">
        {offer.priceAmount.toLocaleString('fr-FR')} {offer.priceCurrency ?? ''}
      </p>
      {!offer.priceConfirmed && (
        <Chip variant="status-warn" className="mt-1">
          À confirmer
        </Chip>
      )}
    </div>
  )
}

export default function AdminSourcingDetailPage() {
  const params = useParams<{ id: string }>()
  const [search, setSearch] = useState<SourcingSearchDetail | null>(null)
  const [matrix, setMatrix] = useState<OfferMatrix | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ message: string; whatsappUrl: string | null; mailto: string | null } | null>(null)

  const load = useCallback(() => {
    return Promise.all([
      sourcingFetch<SourcingSearchDetail>(`/searches/${params.id}`),
      sourcingFetch<OfferMatrix>(`/searches/${params.id}/matrix`),
    ]).then(([detail, mat]) => {
      if (!detail.ok) {
        setError(detail.message)
        return
      }
      setError(null)
      setSearch(detail.data)
      setMatrix(mat.ok ? mat.data : null)
    })
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  const patchOffer = useCallback(
    async (offerId: string, body: Record<string, unknown>) => {
      setBusy(offerId)
      const res = await sourcingFetch(`/offers/${offerId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      setBusy(null)
      if (!res.ok) {
        setError(res.message)
        return
      }
      await load()
    },
    [load],
  )

  const removeOffer = useCallback(
    async (offerId: string) => {
      if (!window.confirm('Supprimer cette offre ? Pour la sortir de l\'arbitrage sans la perdre, utilisez plutôt « Écarter ».')) {
        return
      }
      setBusy(offerId)
      const res = await sourcingFetch(`/offers/${offerId}`, { method: 'DELETE' })
      setBusy(null)
      if (!res.ok) {
        setError(res.message)
        return
      }
      await load()
    },
    [load],
  )

  const requestDraft = useCallback(async (offerId: string) => {
    setBusy(offerId)
    const res = await sourcingFetch<{
      message: string
      channels: { whatsappUrl: string | null; mailto: string | null }
    }>(`/offers/${offerId}/message`, { method: 'POST' })
    setBusy(null)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setDraft({ message: res.data.message, ...res.data.channels })
  }, [])

  const createPo = useCallback(
    async (offerId: string) => {
      setBusy(offerId)
      const res = await sourcingFetch<{ id: string; numero: string }>(
        `/offers/${offerId}/purchase-order`,
        { method: 'POST', body: JSON.stringify({}) },
      )
      setBusy(null)
      if (!res.ok) {
        setError(res.message)
        return
      }
      await load()
    },
    [load],
  )

  if (error && !search) {
    return <div className="p-6 text-sm text-error-fg">{error}</div>
  }
  if (!search) {
    return <div className="p-6 text-sm text-muted">Chargement…</div>
  }

  return (
    <div className="p-4 lg:p-6">
      <Link href="/admin/sourcing" className="text-[13px] text-muted hover:underline">
        ← Recherches
      </Link>

      <div className="mt-3 rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1">
            <h1 className="font-display text-2xl text-ink">{search.partName}</h1>
            <p className="mt-1 text-sm text-muted">
              {[search.vehicleBrand, search.vehicleModel, search.vehicleYear]
                .filter(Boolean)
                .join(' ') || 'Véhicule non précisé'}
              {search.oemReference && ` · OEM ${search.oemReference}`}
              {` · quantité ${search.quantity}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip variant={search.origin === 'MANUAL' ? 'oem' : 'plain'}>
              {ORIGIN_LABEL[search.origin]}
            </Chip>
            {search.origin === 'AGENT' && (
              <Chip
                variant={
                  search.status === 'DONE'
                    ? 'status-ok'
                    : search.status === 'FAILED'
                      ? 'status-err'
                      : 'status-warn'
                }
              >
                {SEARCH_STATUS_LABEL[search.status]}
              </Chip>
            )}
          </div>
        </div>
        {search.quoteRequest && (
          <p className="mt-3 text-sm text-muted">
            Cotation{' '}
            <Link
              href={`/admin/logistique/${search.quoteRequest.id}`}
              className="font-mono text-ink hover:underline"
            >
              {search.quoteRequest.reference}
            </Link>{' '}
            — {search.quoteRequest.contactName}
            {search.quoteRequest.vehicleImmobilized && (
              <Chip variant="status-err" className="ml-2">
                Véhicule immobilisé
              </Chip>
            )}
          </p>
        )}
        {search.status === 'FAILED' && search.error && (
          <p className="mt-3 text-sm text-error-fg">{search.error}</p>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-error-fg">{error}</p>}

      {/* --- Offres --- */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h2 className="flex-1 font-display text-lg text-ink">
          Offres ({search.offers.length})
        </h2>
        <OfferForm searchId={search.id} onAdded={() => void load()} />
      </div>
      <div className="mt-2 overflow-x-auto rounded-md border border-border">
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Fournisseur</Th>
              <Th>Condition</Th>
              <Th align="right">Prix unitaire</Th>
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
                  <span className="font-semibold text-ink">{offer.supplierName}</span>
                  {offer.enteredManually && (
                    <Chip variant="plain" className="ml-2">
                      Saisie
                    </Chip>
                  )}
                  <p className="text-[11px] text-muted-2">
                    {CHANNEL_LABEL[offer.channel]}
                    {offer.country && ` · ${offer.country}`}
                  </p>
                  {offer.url && (
                    <a
                      href={offer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-muted hover:underline"
                    >
                      {offer.sourceSite ?? 'Voir l\'annonce'} ↗
                    </a>
                  )}
                  {offer.title && <p className="mt-1 text-[11px] text-muted">{offer.title}</p>}
                </Td>
                <Td>
                  {offer.condition ? (
                    <ConditionChip condition={offer.condition} />
                  ) : offer.conditionLabel ? (
                    <Chip variant="plain">{offer.conditionLabel}</Chip>
                  ) : (
                    <span className="text-[12px] text-muted-2">—</span>
                  )}
                </Td>
                <Td align="right">
                  <OfferPrice offer={offer} />
                </Td>
                <Td align="right" className="tabular text-muted">
                  {offer.leadTimeDays != null ? `${offer.leadTimeDays} j` : '—'}
                </Td>
                <Td>
                  <select
                    value={offer.chosenMode ?? ''}
                    onChange={(e) =>
                      void patchOffer(offer.id, { chosenMode: e.target.value || null })
                    }
                    disabled={busy === offer.id || offer.status === 'ORDERED'}
                    className="rounded-sm border border-border bg-card px-2 py-1 text-[12px] text-ink"
                  >
                    <option value="">Auto</option>
                    {MODES.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Td>
                <Td>
                  <Chip variant={OFFER_CHIP[offer.status]}>{OFFER_STATUS_LABEL[offer.status]}</Chip>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {offer.status !== 'ORDERED' && (
                      <>
                        <button
                          onClick={() =>
                            void patchOffer(offer.id, {
                              status: offer.status === 'SHORTLISTED' ? 'CANDIDATE' : 'SHORTLISTED',
                            })
                          }
                          disabled={busy === offer.id}
                          className={btnCls}
                        >
                          {offer.status === 'SHORTLISTED' ? 'Retirer' : 'Retenir'}
                        </button>
                        <button
                          onClick={() => void patchOffer(offer.id, { status: 'REJECTED' })}
                          disabled={busy === offer.id}
                          className={btnCls}
                        >
                          Écarter
                        </button>
                        <button
                          onClick={() => void requestDraft(offer.id)}
                          disabled={busy === offer.id}
                          className={btnCls}
                        >
                          Message
                        </button>
                        <button
                          onClick={() => void removeOffer(offer.id)}
                          disabled={busy === offer.id}
                          className={btnCls}
                        >
                          Supprimer
                        </button>
                        <button
                          onClick={() => void createPo(offer.id)}
                          disabled={busy === offer.id || offer.priceAmount == null}
                          title={
                            offer.priceAmount == null
                              ? 'Confirmez le prix avant de commander'
                              : undefined
                          }
                          className={btnCls}
                        >
                          Créer le BC
                        </button>
                      </>
                    )}
                    {offer.purchaseOrderId && (
                      <Link
                        href={`/admin/stock/achats/${offer.purchaseOrderId}`}
                        className={btnCls}
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
                <Td className="text-muted">
                  Aucune offre. Cliquez « Ajouter une offre » pour saisir un lien relevé.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </div>

      {/* --- Brouillon de message --- */}
      {draft && (
        <div className="mt-4 rounded-md border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <h2 className="flex-1 font-display text-lg text-ink">Brouillon d&apos;enquête</h2>
            <button onClick={() => setDraft(null)} className={btnCls}>
              Fermer
            </button>
          </div>
          <p className="mt-1 text-sm text-muted">
            Relisez avant d&apos;envoyer : rien n&apos;est parti automatiquement.
          </p>
          <textarea
            readOnly
            value={draft.message}
            rows={8}
            className="mt-3 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-ink"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => void navigator.clipboard.writeText(draft.message)}
              className={btnCls}
            >
              Copier
            </button>
            {draft.whatsappUrl && (
              <a href={draft.whatsappUrl} target="_blank" rel="noopener noreferrer" className={btnCls}>
                Ouvrir WhatsApp ↗
              </a>
            )}
            {draft.mailto && (
              <a href={draft.mailto} className={btnCls}>
                Ouvrir l&apos;e-mail
              </a>
            )}
          </div>
        </div>
      )}

      {/* --- Matrice d'arbitrage --- */}
      {matrix && matrix.rows.length > 0 && (
        <div className="mt-6 rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-lg text-ink">Matrice d&apos;arbitrage</h2>
          <p className="mt-1 text-sm text-muted">
            Coût total rendu Abidjan, revenu perdu pendant l&apos;immobilisation compris —{' '}
            <strong className="text-ink">{fmtFcfa(matrix.downtimeCostPerDay)}/jour</strong>.
          </p>
          <p className="mt-1 text-xs text-muted-2">
            {matrix.familyLabel} · {matrix.weightKg} kg · {matrix.volumeDm3} dm³
          </p>
          {matrix.pricesUnconfirmed && (
            <p className="mt-2 rounded-sm bg-warn-bg px-3 py-2 text-[13px] text-warn-fg">
              Aucun prix n&apos;a encore été confirmé auprès d&apos;un vendeur : ce classement est
              indicatif.
            </p>
          )}

          <div className="mt-3 overflow-x-auto rounded-md border border-border">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Fournisseur</Th>
                  <Th>Acheminement</Th>
                  <Th align="right">Délai</Th>
                  <Th align="right">Pièce</Th>
                  <Th align="right">Fret</Th>
                  <Th align="right">Douane</Th>
                  <Th align="right">Livraison</Th>
                  <Th align="right">Immobilisation</Th>
                  <Th align="right">Coût total</Th>
                </Tr>
              </Thead>
              <Tbody>
                {matrix.rows.map((row) => (
                  <Tr key={row.offerId || row.option.mode}>
                    <Td>
                      <span
                        className={row.option.recommended ? 'font-semibold text-ink' : 'text-ink'}
                      >
                        {row.supplierName}
                      </span>
                      {row.option.recommended && (
                        <Chip variant="status-ok" className="ml-2">
                          Recommandé
                        </Chip>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {row.condition ? (
                          <ConditionChip condition={row.condition} />
                        ) : row.conditionLabel ? (
                          <Chip variant="plain">{row.conditionLabel}</Chip>
                        ) : null}
                        {!row.priceConfirmed && (
                          <Chip variant="status-warn">Prix à confirmer</Chip>
                        )}
                      </div>
                      {row.option.warnings.map((w) => (
                        <p key={w} className="mt-1 text-[11px] text-warn-fg">
                          ⚠ {w}
                        </p>
                      ))}
                    </Td>
                    <Td className="text-muted">{row.option.label}</Td>
                    <Td align="right" className="tabular text-ink">
                      {fmtDelay(row.option.transitDays)}
                    </Td>
                    <Td align="right" className="tabular text-ink">
                      {fmtFcfa(row.option.partPrice)}
                    </Td>
                    <Td align="right" className="tabular text-muted">
                      {fmtFcfa(row.option.freightCost)}
                    </Td>
                    <Td align="right" className="tabular text-muted">
                      {fmtFcfa(row.option.customsCost)}
                    </Td>
                    <Td align="right" className="tabular text-muted">
                      {fmtFcfa(row.option.lastMileCost)}
                    </Td>
                    <Td align="right" className="tabular text-muted">
                      {fmtFcfa(row.option.downtimeCost)}
                    </Td>
                    <Td
                      align="right"
                      className={`tabular ${row.option.recommended ? 'font-semibold text-ink' : 'text-ink'}`}
                    >
                      {fmtFcfa(row.option.totalCost)}
                      {row.option.extraCostVsBest > 0 && (
                        <p className="text-[11px] font-normal text-error-fg">
                          +{fmtFcfa(row.option.extraCostVsBest)}
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
