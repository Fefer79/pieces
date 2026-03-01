'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

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
  createdAt: string
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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [oemReference, setOemReference] = useState('')
  const [vehicleCompatibility, setVehicleCompatibility] = useState('')
  const [price, setPrice] = useState('')

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

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <p className="text-sm text-gray-500">Chargement...</p>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <p className="text-sm text-[#D32F2F]">{error ?? 'Fiche introuvable'}</p>
        <button onClick={() => router.push('/vendors/catalog')} className="mt-4 text-sm text-[#1976D2]">
          Retour au catalogue
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <button onClick={() => router.push('/vendors/catalog')} className="mb-4 text-sm text-[#1976D2]">
        &larr; Retour au catalogue
      </button>

      {/* Image */}
      <div className="mb-4 overflow-hidden rounded-lg bg-gray-100">
        {item.imageMediumUrl ? (
          <img src={item.imageMediumUrl} alt={item.name ?? 'Pièce'} className="w-full object-cover" />
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">Photo en cours de traitement...</div>
        )}
      </div>

      {/* Status badge + alerts */}
      <div className="mb-4 flex items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
          item.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700'
            : item.status === 'PUBLISHED' ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
        }`}>
          {item.status === 'DRAFT' ? 'Brouillon' : item.status === 'PUBLISHED' ? 'Publié' : 'Archivé'}
        </span>
        {item.status === 'PUBLISHED' && !item.inStock && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">Épuisée</span>
        )}
        {item.priceAlertFlag && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">Alerte prix</span>
        )}
        {item.qualityIssue && (
          <span className="text-xs text-amber-600" title={item.qualityIssue}>Photo</span>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-[#D32F2F]">{error}</p>}
      {success && <p className="mb-3 text-sm text-green-600">{success}</p>}

      {/* Edit form */}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Nom de la pièce</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={item.aiGenerated ? 'Identifié par IA...' : 'Saisissez le nom'}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Catégorie</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex: Filtration, Freinage..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Référence OEM</label>
          <input
            type="text"
            value={oemReference}
            onChange={(e) => setOemReference(e.target.value)}
            placeholder="Ex: 90915-YZZD4"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Compatibilité véhicule</label>
          <input
            type="text"
            value={vehicleCompatibility}
            onChange={(e) => setVehicleCompatibility(e.target.value)}
            placeholder="Ex: Toyota Hilux 2005-2015"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Prix (FCFA) {item.suggestedPrice && !price && <span className="text-gray-400">— Suggestion IA : {item.suggestedPrice.toLocaleString('fr-FR')} F</span>}
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={item.suggestedPrice ? `${item.suggestedPrice.toLocaleString('fr-FR')} F (suggestion IA)` : 'Saisissez votre prix'}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
            min="0"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg border border-[#1976D2] py-3 text-sm font-semibold text-[#1976D2] transition-colors hover:bg-blue-50 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>

        {item.status === 'DRAFT' && (
          <button
            onClick={handlePublish}
            disabled={saving || !price}
            className="w-full rounded-lg bg-[#1976D2] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1565C0] disabled:opacity-50"
          >
            Publier la fiche
          </button>
        )}

        {item.status === 'PUBLISHED' && (
          <button
            onClick={handleToggleStock}
            disabled={saving}
            className={`w-full rounded-lg py-3 text-sm font-semibold transition-colors ${
              item.inStock
                ? 'border border-red-300 text-red-600 hover:bg-red-50'
                : 'border border-green-300 text-green-600 hover:bg-green-50'
            }`}
          >
            {item.inStock ? 'Marquer épuisée' : 'Remettre en stock'}
          </button>
        )}
      </div>
    </div>
  )
}
