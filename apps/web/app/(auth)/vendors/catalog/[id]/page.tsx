'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { catalogFetch } from '@/lib/catalog-api'
import { PartForm, type PartFormInitial } from '@/components/part-form'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Price } from '@/components/ui/price'

interface CatalogItemDetail extends PartFormInitial {
  id: string
  status: string
  suggestedPrice: number | null
  aiGenerated: boolean
  qualityIssue: string | null
  priceAlertFlag: boolean
  commissionAcceptedAt: string | null
  imageJobStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null
  imageJobError: string | null
}

export default function VendorCatalogDetailPage() {
  const params = useParams()
  const itemId = params.id as string

  const [item, setItem] = useState<CatalogItemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [retryMessage, setRetryMessage] = useState<string | null>(null)

  const fetchItem = useCallback(
    () =>
      catalogFetch<CatalogItemDetail>(`/items/${itemId}`).then((r) => {
        if (r.ok) setItem(r.data)
        else setError(r.message)
        setLoading(false)
      }),
    [itemId],
  )

  useEffect(() => {
    fetchItem()
  }, [fetchItem])

  const handleRetryImage = async () => {
    setRetrying(true)
    setRetryMessage(null)
    const r = await catalogFetch(`/items/${itemId}/retry-image`, { method: 'POST' })
    setRetrying(false)
    if (!r.ok) {
      setRetryMessage(r.message)
      return
    }
    setRetryMessage('Traitement relancé. La photo apparaîtra dans quelques instants.')
    await fetchItem()
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error ?? 'Fiche introuvable'}
        </div>
        <Link href="/vendors/catalog" className="mt-4 inline-block text-sm text-ink-2 hover:underline">
          ← Retour au catalogue
        </Link>
      </div>
    )
  }

  const statusChip =
    item.status === 'PUBLISHED'
      ? { variant: 'status-ok' as const, label: 'Publié' }
      : item.status === 'DRAFT'
        ? { variant: 'status-warn' as const, label: 'Brouillon' }
        : { variant: 'plain' as const, label: 'Archivé' }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <Link href="/vendors/catalog" className="mb-4 inline-block text-sm text-ink-2 hover:underline">
        ← Retour au catalogue
      </Link>

      {/* Statut + alertes */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip variant={statusChip.variant}>{statusChip.label}</Chip>
        {item.status === 'PUBLISHED' && item.inStock === false && (
          <Chip variant="status-err">Épuisée</Chip>
        )}
        {item.priceAlertFlag && <Chip variant="status-warn">Alerte prix</Chip>}
        {item.qualityIssue && (
          <span
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-warn-fg"
            title={item.qualityIssue}
          >
            ⚠ Photo
          </span>
        )}
      </div>

      {item.status === 'DRAFT' && (
        <p className="mb-4 rounded-md border border-border bg-card p-3 text-xs text-muted">
          Cette fiche est un <strong>brouillon</strong>. Complétez au minimum le prix,
          l&apos;état et la garantie, puis « Enregistrer et publier ».
        </p>
      )}

      {item.suggestedPrice != null && item.price == null && (
        <p className="mb-4 text-xs text-muted">
          Suggestion de prix IA : <Price amount={item.suggestedPrice} className="text-xs" />
        </p>
      )}

      {item.imageJobStatus === 'FAILED' && (
        <div className="mb-4 flex items-center gap-2">
          <p className="text-xs text-status-err">Échec du traitement de la photo principale</p>
          <Button size="sm" variant="secondary" onClick={handleRetryImage} disabled={retrying}>
            {retrying ? 'Relance…' : 'Réessayer'}
          </Button>
        </div>
      )}
      {retryMessage && <p className="mb-4 text-xs text-muted">{retryMessage}</p>}

      <PartForm
        actor="vendor"
        mode="edit"
        partId={itemId}
        initial={item}
        publishAfterSave={item.status === 'DRAFT'}
      />
    </div>
  )
}
