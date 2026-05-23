'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

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
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <button
        onClick={() => router.back()}
        className="mb-3 text-sm text-ink-2 hover:underline"
      >
        ← Retour
      </button>
      <div className="mb-2">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Boutique
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Zones de livraison</h1>
      </div>
      <p className="mb-5 text-sm text-muted">
        Sélectionnez les communes d&apos;Abidjan où vous acceptez de livrer. Les acheteurs hors zone ne verront pas vos annonces.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md border border-success-fg/20 bg-success-bg p-3 text-sm text-success-fg">
          Zones mises à jour avec succès.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : (
        <>
          <label
            className={`mb-3 flex cursor-pointer items-center gap-3 rounded-md border-2 p-3.5 transition-colors ${
              allSelected ? 'border-ink-2 bg-[rgba(0,35,102,0.04)]' : 'border-border bg-card hover:border-border-strong'
            }`}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-5 w-5 accent-[color:var(--color-ink-2)]"
            />
            <span className={`text-sm font-semibold ${allSelected ? 'text-ink-2' : 'text-ink'}`}>
              Tout Abidjan
            </span>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            {ABIDJAN_COMMUNES.map((commune) => {
              const checked = selectedZones.includes(commune)
              return (
                <label
                  key={commune}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-all ${
                    checked
                      ? 'border-ink-2 bg-[rgba(0,35,102,0.04)]'
                      : 'border-border bg-card hover:border-border-strong'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCommune(commune)}
                    className="h-5 w-5 accent-[color:var(--color-ink-2)]"
                  />
                  <span className={`text-sm ${checked ? 'font-medium text-ink-2' : 'text-ink'}`}>
                    {commune}
                  </span>
                </label>
              )
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="font-mono text-xs text-muted">
              {selectedZones.length}/{ABIDJAN_COMMUNES.length} sélectionnée
              {selectedZones.length > 1 ? 's' : ''}
            </p>
            <Button
              variant="accent"
              size="lg"
              onClick={handleSave}
              disabled={saving || selectedZones.length === 0}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
