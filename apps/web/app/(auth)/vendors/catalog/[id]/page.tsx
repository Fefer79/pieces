'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Price } from '@/components/ui/price'

type SupabaseClient = ReturnType<typeof createClient>

interface CatalogItem {
  id: string
  name: string | null
  category: string | null
  oemReference: string | null
  vehicleCompatibility: string | null
  suggestedPrice: number | null
  price: number | null
  status: string
  imageMediumUrl: string | null
  imageThumbUrl: string | null
  aiGenerated: boolean
  aiConfidence: number | null
  qualityScore: number | null
  qualityIssue: string | null
  inStock: boolean
  priceAlertFlag: boolean
  condition: 'NEW' | 'USED' | 'REFURBISHED' | null
  warrantyMonths: number | null
  createdAt: string
  imageJobStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null
  imageJobError: string | null
}

export default function VendorCatalogDetailPage() {
  const router = useRouter()
  const params = useParams()
  const itemId = params.id as string
  const supabaseRef = useRef<SupabaseClient | null>(null)

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [item, setItem] = useState<CatalogItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [oemReference, setOemReference] = useState('')
  const [vehicleCompatibility, setVehicleCompatibility] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<'NEW' | 'USED' | 'REFURBISHED' | ''>('')
  const [warrantyMonths, setWarrantyMonths] = useState<string>('')

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  }, [])

  const fetchItem = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setLoading(false)
        return
      }

      const res = await fetch(`/api/v1/catalog/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()

      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors du chargement')
        setLoading(false)
        return
      }

      const data = body.data as CatalogItem
      setItem(data)
      setName(data.name ?? '')
      setCategory(data.category ?? '')
      setOemReference(data.oemReference ?? '')
      setVehicleCompatibility(data.vehicleCompatibility ?? '')
      setPrice(data.price !== null ? String(data.price) : '')
      setCondition(data.condition ?? '')
      setWarrantyMonths(data.warrantyMonths !== null ? String(data.warrantyMonths) : '')
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, itemId])

  useEffect(() => {
    fetchItem()
  }, [fetchItem])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const token = await getAccessToken()
      if (!token) { setError('Session expirée.'); setSaving(false); return }

      const body: Record<string, unknown> = {}
      if (name !== (item?.name ?? '')) body.name = name
      if (category !== (item?.category ?? '')) body.category = category
      if (oemReference !== (item?.oemReference ?? '')) body.oemReference = oemReference || null
      if (vehicleCompatibility !== (item?.vehicleCompatibility ?? '')) body.vehicleCompatibility = vehicleCompatibility || null
      if (price !== (item?.price !== null ? String(item?.price) : '')) {
        body.price = price ? parseInt(price, 10) : undefined
      }
      if (condition !== (item?.condition ?? '')) {
        if (condition) body.condition = condition
      }
      const currentWarranty = item?.warrantyMonths !== null && item?.warrantyMonths !== undefined ? String(item.warrantyMonths) : ''
      if (warrantyMonths !== currentWarranty && warrantyMonths !== '') {
        body.warrantyMonths = parseInt(warrantyMonths, 10)
      }

      if (Object.keys(body).length === 0) {
        setSuccess('Aucune modification.')
        setSaving(false)
        return
      }

      const res = await fetch(`/api/v1/catalog/items/${itemId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json()

      if (!res.ok) {
        setError(result.error?.message ?? 'Erreur lors de la sauvegarde')
      } else {
        setItem(result.data)
        setSuccess('Modifications enregistrées.')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const token = await getAccessToken()
      if (!token) { setError('Session expirée.'); setSaving(false); return }

      const res = await fetch(`/api/v1/catalog/items/${itemId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await res.json()

      if (!res.ok) {
        setError(result.error?.message ?? 'Erreur lors de la publication')
      } else {
        setItem(result.data)
        setSuccess('Fiche publiée !')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStock = async () => {
    if (!item) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const token = await getAccessToken()
      if (!token) { setError('Session expirée.'); setSaving(false); return }

      const res = await fetch(`/api/v1/catalog/items/${itemId}/stock`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inStock: !item.inStock }),
      })
      const result = await res.json()

      if (!res.ok) {
        setError(result.error?.message ?? 'Erreur')
      } else {
        setItem(result.data)
        setSuccess(result.data.inStock ? 'Pièce remise en stock.' : 'Pièce marquée épuisée.')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setSaving(false)
    }
  }

  const handleRetryImage = async () => {
    if (!item) return
    setRetrying(true)
    setError(null)
    setSuccess(null)

    try {
      const token = await getAccessToken()
      if (!token) { setError('Session expirée.'); setRetrying(false); return }

      const res = await fetch(`/api/v1/catalog/items/${itemId}/retry-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await res.json()

      if (!res.ok) {
        setError(result.error?.message ?? 'Erreur')
      } else {
        setSuccess('Traitement relancé. La photo apparaîtra dans quelques instants.')
        await fetchItem()
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setRetrying(false)
    }
  }

  const INPUT =
    'w-full rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]'
  const LABEL = 'mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'

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
        <button
          onClick={() => router.push('/vendors/catalog')}
          className="mt-4 text-sm text-ink-2 hover:underline"
        >
          ← Retour au catalogue
        </button>
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
      <button
        onClick={() => router.push('/vendors/catalog')}
        className="mb-4 text-sm text-ink-2 hover:underline"
      >
        ← Retour au catalogue
      </button>

      {/* Image */}
      <div className="mb-5 overflow-hidden rounded-md border border-border bg-surface">
        {item.imageMediumUrl ? (
          <img
            src={item.imageMediumUrl}
            alt={item.name ?? 'Pièce'}
            className="w-full object-cover"
          />
        ) : item.imageJobStatus === 'FAILED' ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm font-medium text-status-err">
              Échec du traitement de la photo
            </p>
            {item.imageJobError && (
              <p className="max-w-xs text-xs text-muted-2">{item.imageJobError}</p>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRetryImage}
              disabled={retrying}
            >
              {retrying ? 'Relance…' : 'Réessayer'}
            </Button>
          </div>
        ) : (
          <div className="flex h-56 items-center justify-center text-sm text-muted-2">
            Photo en cours de traitement…
          </div>
        )}
      </div>

      {/* Status + alerts */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip variant={statusChip.variant}>{statusChip.label}</Chip>
        {item.condition === 'NEW' && <Chip variant="neuf">Neuf</Chip>}
        {item.condition === 'USED' && <Chip variant="occasion">Occasion</Chip>}
        {item.condition === 'REFURBISHED' && <Chip variant="reusine">Ré-usiné</Chip>}
        {item.status === 'PUBLISHED' && !item.inStock && (
          <Chip variant="status-err">Épuisée</Chip>
        )}
        {item.priceAlertFlag && <Chip variant="status-warn">Alerte prix</Chip>}
        {item.qualityIssue && (
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-warn-fg" title={item.qualityIssue}>
            ⚠ Photo
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-md border border-success-fg/20 bg-success-bg p-3 text-sm text-success-fg">
          {success}
        </div>
      )}

      {/* Edit form */}
      <div className="space-y-4 rounded-md border border-border bg-card p-5">
        <div>
          <label className={LABEL}>Nom de la pièce</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={item.aiGenerated ? 'Identifié par IA…' : 'Saisissez le nom'}
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL}>Catégorie</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex : Filtration, Freinage…"
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL}>Référence OEM</label>
          <input
            type="text"
            value={oemReference}
            onChange={(e) => setOemReference(e.target.value)}
            placeholder="Ex : 90915-YZZD4"
            className={`${INPUT} font-mono`}
          />
        </div>

        <div>
          <label className={LABEL}>Compatibilité véhicule</label>
          <input
            type="text"
            value={vehicleCompatibility}
            onChange={(e) => setVehicleCompatibility(e.target.value)}
            placeholder="Ex : Toyota Hilux 2005-2015"
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL}>Prix (FCFA)</label>
          {item.suggestedPrice && !price && (
            <div className="mb-1.5 text-xs text-muted">
              Suggestion IA : <Price amount={item.suggestedPrice} className="text-xs" />
            </div>
          )}
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={item.suggestedPrice ? `${item.suggestedPrice.toLocaleString('fr-FR')} (suggestion IA)` : 'Saisissez votre prix'}
            className={`${INPUT} font-mono`}
            min="0"
          />
        </div>

        <div>
          <label className={LABEL}>
            État <span className="text-accent">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'NEW', label: 'Neuf', active: 'border-neuf-fg/50 bg-neuf-bg text-neuf-fg' },
              { value: 'USED', label: 'Occasion', active: 'border-occasion-fg/50 bg-occasion-bg text-occasion-fg' },
              { value: 'REFURBISHED', label: 'Reconditionné', active: 'border-reusine-fg/50 bg-reusine-bg text-reusine-fg' },
            ].map(({ value, label, active }) => {
              const isActive = condition === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCondition(value as 'NEW' | 'USED' | 'REFURBISHED')}
                  className={`rounded-md border-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] transition-all ${
                    isActive ? active : 'border-border bg-card text-muted hover:border-border-strong hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label htmlFor="warranty" className={LABEL}>
            Garantie vendeur <span className="text-accent">*</span>
          </label>
          <select
            id="warranty"
            value={warrantyMonths}
            onChange={(e) => setWarrantyMonths(e.target.value)}
            className={INPUT}
          >
            <option value="">— Choisir la durée —</option>
            <option value="0">Sans garantie</option>
            <option value="1">1 mois</option>
            <option value="3">3 mois</option>
            <option value="6">6 mois</option>
            <option value="12">1 an</option>
            <option value="24">2 ans</option>
            <option value="36">3 ans</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-2.5">
        <Button variant="secondary" block onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </Button>

        {item.status === 'DRAFT' && (
          <Button
            variant="accent"
            size="lg"
            block
            onClick={handlePublish}
            disabled={saving || !price}
          >
            Publier la fiche
          </Button>
        )}

        {item.status === 'PUBLISHED' && (
          <Button variant="secondary" block onClick={handleToggleStock} disabled={saving}>
            {item.inStock ? 'Marquer épuisée' : 'Remettre en stock'}
          </Button>
        )}
      </div>
    </div>
  )
}
