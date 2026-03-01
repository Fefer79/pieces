'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

const ABIDJAN_COMMUNES = [
  'Abobo',
  'Adjamé',
  'Anyama',
  'Attécoubé',
  'Bingerville',
  'Cocody',
  'Koumassi',
  'Marcory',
  'Plateau',
  'Port-Bouët',
  'Songon',
  'Treichville',
  'Yopougon',
]

export default function DeliveryZonesPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [selectedZones, setSelectedZones] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  }, [])

  const fetchZones = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/v1/vendors/me/delivery-zones', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const body = await res.json()

      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors du chargement')
        setLoading(false)
        return
      }

      setSelectedZones(body.data.zones)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    fetchZones()
  }, [fetchZones])

  const allSelected = ABIDJAN_COMMUNES.every((c) => selectedZones.includes(c))

  function toggleAll() {
    if (allSelected) {
      setSelectedZones([])
    } else {
      setSelectedZones([...ABIDJAN_COMMUNES])
    }
  }

  function toggleCommune(commune: string) {
    setSelectedZones((prev) =>
      prev.includes(commune)
        ? prev.filter((c) => c !== commune)
        : [...prev, commune],
    )
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setSaving(false)
        return
      }

      const res = await fetch('/api/v1/vendors/me/delivery-zones', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zones: selectedZones }),
      })

      const body = await res.json()

      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors de la sauvegarde')
        setSaving(false)
        return
      }

      setSelectedZones(body.data.zones)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-sm text-[#1976D2] hover:underline"
        >
          &larr; Retour
        </button>
        <h1 className="text-xl font-bold text-[#1A1A1A]">Zones de livraison</h1>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        Sélectionnez les communes dans lesquelles vous acceptez de livrer.
      </p>

      {error && <p className="mb-4 text-sm text-[#D32F2F]">{error}</p>}
      {success && <p className="mb-4 text-sm text-green-600">Zones mises à jour avec succès.</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <>
          <label className="mb-3 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-[#1976D2] bg-blue-50 p-3">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-5 w-5 accent-[#1976D2]"
            />
            <span className="text-sm font-semibold text-[#1976D2]">Tout Abidjan</span>
          </label>

          <div className="space-y-2">
            {ABIDJAN_COMMUNES.map((commune) => (
              <label
                key={commune}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedZones.includes(commune)}
                  onChange={() => toggleCommune(commune)}
                  className="h-5 w-5 accent-[#1976D2]"
                />
                <span className="text-sm text-[#1A1A1A]">{commune}</span>
              </label>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || selectedZones.length === 0}
            className="mt-6 w-full rounded-lg bg-[#1976D2] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1565C0] disabled:bg-gray-300 disabled:text-gray-500"
          >
            {saving ? 'Enregistrement...' : `Enregistrer (${selectedZones.length} commune${selectedZones.length > 1 ? 's' : ''})`}
          </button>
        </>
      )}
    </div>
  )
}
