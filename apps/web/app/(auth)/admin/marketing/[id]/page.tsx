'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { marketingFetch, type MarketingCampaign } from '@/lib/marketing-api'
import {
  AUDIENCE_TYPE_LABELS,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_VARIANTS,
  formatDateTime,
} from '@/lib/marketing-utils'
import { StatCard } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'

export default function CampagneDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  const load = useCallback(() => {
    marketingFetch<MarketingCampaign>(`/campaigns/${id}`).then((res) => {
      if (res.ok) {
        setCampaign(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const act = useCallback(
    (action: 'launch' | 'cancel', confirmation: string) => {
      if (!window.confirm(confirmation)) return
      setActing(true)
      setError(null)
      setNotice(null)
      marketingFetch<MarketingCampaign>(`/campaigns/${id}/${action}`, { method: 'POST' }).then(
        (res) => {
          setActing(false)
          if (res.ok) {
            setNotice(
              action === 'launch'
                ? res.data.statut === 'PLANIFIEE'
                  ? 'Campagne planifiée : l’envoi partira à la date prévue.'
                  : 'Campagne lancée : l’envoi est en cours.'
                : 'Campagne annulée.',
            )
            load()
          } else {
            setError(res.message)
          }
        },
      )
    },
    [id, load],
  )

  if (error && !campaign) {
    return (
      <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
        {error}
      </div>
    )
  }
  if (!campaign) {
    return <div className="text-sm text-muted">Chargement…</div>
  }

  const actionable = campaign.statut === 'BROUILLON' || campaign.statut === 'PLANIFIEE'

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl text-ink">{campaign.nom}</h2>
        <Chip variant={CAMPAIGN_STATUS_VARIANTS[campaign.statut]}>
          {CAMPAIGN_STATUS_LABELS[campaign.statut]}
        </Chip>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-3 rounded-md border border-success-fg/20 bg-success-bg p-3 text-sm text-success-fg">
          {notice}
        </div>
      )}

      <div className="mb-4 rounded-md border border-border bg-card p-4">
        <h3 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Message
        </h3>
        <p className="whitespace-pre-wrap text-sm text-ink">{campaign.message}</p>
        <p className="mt-3 text-sm text-muted">
          Audience : {AUDIENCE_TYPE_LABELS[campaign.audienceType]} · {campaign.audienceValue} ·
          créée par {campaign.createdBy.name ?? '—'}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Cibles" value={campaign.totalCibles} />
        <StatCard label="Envoyés" value={campaign.envoyes} />
        <StatCard label="Échecs" value={campaign.echecs} />
        <StatCard label="Désabonnés (exclus)" value={campaign.optouts} />
        <StatCard label="Sans téléphone (exclus)" value={campaign.sansTelephone} />
      </div>

      <div className="mb-4 grid gap-2 rounded-md border border-border bg-card p-4 text-sm sm:grid-cols-2">
        <div>
          <span className="text-muted">Créée le : </span>
          <span className="text-ink">{formatDateTime(campaign.createdAt)}</span>
        </div>
        <div>
          <span className="text-muted">Envoi planifié : </span>
          <span className="text-ink">{formatDateTime(campaign.scheduledAt)}</span>
        </div>
        <div>
          <span className="text-muted">Démarrée le : </span>
          <span className="text-ink">{formatDateTime(campaign.startedAt)}</span>
        </div>
        <div>
          <span className="text-muted">Terminée le : </span>
          <span className="text-ink">{formatDateTime(campaign.completedAt)}</span>
        </div>
      </div>

      {actionable && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={acting}
            onClick={() =>
              act('launch', `Lancer la campagne « ${campaign.nom} » ? L'envoi WhatsApp partira aux destinataires de l'audience.`)
            }
            className="rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
          >
            Lancer maintenant
          </button>
          <button
            type="button"
            disabled={acting}
            onClick={() => act('cancel', `Annuler la campagne « ${campaign.nom} » ?`)}
            className="rounded-sm border border-error-fg/30 bg-error-bg px-4 py-2 text-sm font-semibold text-error-fg disabled:opacity-40"
          >
            Annuler la campagne
          </button>
        </div>
      )}
    </div>
  )
}
