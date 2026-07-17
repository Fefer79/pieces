'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DEFAULT_VEHICLE_TYPE } from 'shared/constants'
import { createClient } from '@/lib/supabase'
import { useSelectedVehicle } from '@/lib/selected-vehicle'
import { PartThumb } from '@/components/ui/part-thumb'
import Link from 'next/link'

type SupabaseClient = ReturnType<typeof createClient>

interface PartResult {
  id: string
  name: string | null
  category: string | null
  price: number | null
  imageThumbUrl: string | null
  oemReference: string | null
  vendor: { id: string; shopName: string }
}

function PartCard({ part }: { part: PartResult }) {
  return (
    <Link
      href={`/produit/${part.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors hover:border-gray-300"
    >
      <div className="aspect-square w-full overflow-hidden bg-surface">
        <PartThumb src={part.imageThumbUrl} alt={part.name} />
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-medium text-[#1A1A1A]">
          {part.name ?? 'Pièce'}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">{part.category ?? '—'}</p>
        <p className="mt-auto truncate pt-2 text-xs text-gray-400">{part.vendor.shopName}</p>
        {part.price != null && (
          <p className="mt-1 text-sm font-bold text-[#1A1A1A]">
            {part.price.toLocaleString('fr-FR')} F
          </p>
        )}
      </div>
    </Link>
  )
}

export default function YearPartsPage() {
  const router = useRouter()
  const params = useParams()
  const brand = decodeURIComponent(params.brand as string)
  const model = decodeURIComponent(params.model as string)
  const year = params.year as string

  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const { setVehicle: persistVehicle } = useSelectedVehicle()

  // Persist this vehicle as the active selection on landing
  useEffect(() => {
    if (brand && model && year) {
      persistVehicle({ type: DEFAULT_VEHICLE_TYPE, brand, model, year })
    }
  }, [brand, model, year, persistVehicle])

  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [parts, setParts] = useState<PartResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [alreadySaved, setAlreadySaved] = useState(false)
  const [savingVehicle, setSavingVehicle] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    async function checkAuthAndVehicles() {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) return
      setIsAuth(true)
      try {
        const res = await fetch('/api/v1/users/me/vehicles', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const body = await res.json()
          const vehicles = (body.data ?? []) as Array<{ brand: string; model: string; year: number }>
          const exists = vehicles.some(
            (v) => v.brand.toLowerCase() === brand.toLowerCase() &&
                   v.model.toLowerCase() === model.toLowerCase() &&
                   v.year === parseInt(year, 10),
          )
          setAlreadySaved(exists)
        }
      } catch {
        // ignore
      }
    }
    checkAuthAndVehicles()
  }, [brand, model, year])

  async function handleSaveVehicle() {
    if (savingVehicle || alreadySaved) return
    setSavingVehicle(true)
    setSaveStatus('idle')
    setSaveError('')
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const res = await fetch('/api/v1/users/me/vehicles', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand,
          model,
          year: parseInt(year, 10),
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        setSaveError(body.error?.message ?? "Erreur lors de l'enregistrement")
        setSaveStatus('error')
        return
      }
      setAlreadySaved(true)
      setSaveStatus('success')
    } catch {
      setSaveError('Erreur de connexion')
      setSaveStatus('error')
    } finally {
      setSavingVehicle(false)
    }
  }

  useEffect(() => {
    fetch('/api/v1/browse/categories')
      .then((r) => r.json())
      .then((body) => setCategories(body.data))
      .catch(() => {})
  }, [])

  const fetchParts = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ brand, model, year })
      if (selectedCategory) qs.set('category', selectedCategory)
      const r = await fetch(`/api/v1/browse/parts?${qs}`)
      const body = await r.json()
      setParts(body.data.items)
      setTotal(body.data.pagination.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [brand, model, year, selectedCategory])

  useEffect(() => {
    fetchParts()
  }, [fetchParts])

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-8">
      <button onClick={() => router.back()} className="mb-2 text-sm text-[#002366] hover:underline">&larr; Retour</button>
      <h1 className="mb-1 text-xl font-bold text-[#1A1A1A]">{brand} {model} {year}</h1>
      <p className="mb-3 text-sm text-gray-500">{total} pièce{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''}</p>

      {isAuth && (
        <button
          onClick={handleSaveVehicle}
          disabled={savingVehicle || alreadySaved}
          className={`mb-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            alreadySaved
              ? 'border border-green-200 bg-green-50 text-green-700'
              : 'border border-[#002366] text-[#002366] hover:bg-[#002366] hover:text-white disabled:opacity-50'
          }`}
        >
          {alreadySaved ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Dans Mes véhicules
            </>
          ) : savingVehicle ? (
            'Enregistrement...'
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Ajouter à Mes véhicules
            </>
          )}
        </button>
      )}
      {saveStatus === 'error' && saveError && (
        <p className="mb-3 text-sm text-red-600">{saveError}</p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${!selectedCategory ? 'bg-[#002366] text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Toutes
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${selectedCategory === cat ? 'bg-[#002366] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Chargement...</p>}

      {!loading && parts.length === 0 && (
        <div className="rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Aucune pièce disponible pour ce véhicule.</p>
          <p className="mt-1 text-xs text-gray-400">Essayez une autre catégorie ou cherchez par référence.</p>
        </div>
      )}

      {!loading && parts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {parts.map((part) => (
            <PartCard key={part.id} part={part} />
          ))}
        </div>
      )}
    </div>
  )
}
