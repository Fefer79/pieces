'use client'

import { useEffect, useState } from 'react'

export interface VehicleSelection {
  brand: string
  model: string
  year: number | ''
  engine: string
  vin: string
}

type Patch = Partial<VehicleSelection>

async function getList<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const body = await res.json()
    return (body.data as T[]) ?? []
  } catch {
    return []
  }
}

// Garantit que la valeur courante est sélectionnable même si elle n'est pas
// (encore) dans la liste chargée — ex. marque issue d'un décodage VIN dont la
// casse diffère du catalogue.
function withCurrent(options: string[], current: string): string[] {
  if (!current) return options
  return options.some((o) => o.toLowerCase() === current.toLowerCase())
    ? options
    : [current, ...options]
}

/**
 * Sélecteur véhicule en cascade (Marque → Modèle → Année → Motorisation)
 * doublé d'un décodage VIN qui pré-remplit marque/modèle/année. Contrôlé :
 * remonte chaque changement via onChange(patch).
 */
export function VehiclePicker({
  value,
  onChange,
}: {
  value: VehicleSelection
  onChange: (patch: Patch) => void
}) {
  const [brands, setBrands] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [years, setYears] = useState<number[]>([])
  const [engines, setEngines] = useState<string[]>([])

  const [vinLoading, setVinLoading] = useState(false)
  const [vinMsg, setVinMsg] = useState<string | null>(null)

  // Marques au montage.
  useEffect(() => {
    getList<string>('/api/v1/browse/brands').then(setBrands)
  }, [])

  // Modèles + reset quand la marque change.
  useEffect(() => {
    if (!value.brand) {
      setModels([])
      return
    }
    getList<string>(`/api/v1/browse/brands/${encodeURIComponent(value.brand)}/models`).then(setModels)
  }, [value.brand])

  // Années + motorisations quand le modèle change.
  useEffect(() => {
    if (!value.brand || !value.model) {
      setYears([])
      setEngines([])
      return
    }
    const base = `/api/v1/browse/brands/${encodeURIComponent(value.brand)}/models/${encodeURIComponent(value.model)}`
    getList<number>(`${base}/years`).then(setYears)
    getList<string>(`${base}/engines`).then(setEngines)
  }, [value.brand, value.model])

  async function decodeVin() {
    const v = value.vin.trim().toUpperCase()
    if (v.length !== 17) return
    setVinLoading(true)
    setVinMsg(null)
    try {
      const res = await fetch('/api/v1/browse/vin-decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin: v }),
      })
      const body = await res.json()
      const d = body.data ?? body
      if (res.ok && d?.decoded && d.make) {
        onChange({
          brand: d.make,
          model: d.model ?? '',
          year: d.year ?? '',
          engine: '',
          vin: v,
        })
        setVinMsg(`Reconnu : ${d.make}${d.model ? ` ${d.model}` : ''}${d.year ? ` (${d.year})` : ''} — choisissez la motorisation.`)
      } else {
        setVinMsg('VIN non reconnu — renseignez la marque/modèle/année manuellement.')
      }
    } catch {
      setVinMsg('Erreur de décodage — réessayez ou saisissez manuellement.')
    } finally {
      setVinLoading(false)
    }
  }

  const brandOptions = withCurrent(brands, value.brand)
  const modelOptions = withCurrent(models, value.model)
  const engineOptions = withCurrent(engines, value.engine)

  return (
    <div className="space-y-3">
      {/* VIN auto-fill */}
      <div className="rounded-sm border border-border bg-surface p-3">
        <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          VIN (carte grise) — remplit le reste
        </label>
        <div className="mt-1 flex gap-2">
          <input
            value={value.vin}
            onChange={(e) => onChange({ vin: e.target.value.toUpperCase().slice(0, 17) })}
            placeholder="17 caractères"
            className="w-full rounded-sm border border-border bg-white px-3 py-2 font-mono text-sm uppercase tracking-wide text-ink"
          />
          <button
            type="button"
            onClick={decodeVin}
            disabled={value.vin.trim().length !== 17 || vinLoading}
            className="flex-shrink-0 rounded-sm bg-ink-2 px-3 py-2 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50"
          >
            {vinLoading ? 'Décodage…' : 'Décoder'}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-muted">
          {vinMsg ?? 'Optionnel — ou choisissez directement dans les menus ci-dessous.'}
        </p>
      </div>

      {/* Cascading selects */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Marque *"
          value={value.brand}
          options={brandOptions}
          onChange={(v) => onChange({ brand: v, model: '', year: '', engine: '' })}
        />
        <Select
          label="Modèle *"
          value={value.model}
          options={modelOptions}
          disabled={!value.brand}
          onChange={(v) => onChange({ model: v, year: '', engine: '' })}
        />
        <NumberSelect
          label="Année *"
          value={value.year}
          options={years}
          disabled={!value.model}
          onChange={(v) => onChange({ year: v })}
        />
        <Select
          label="Motorisation"
          value={value.engine}
          options={engineOptions}
          disabled={!value.model}
          placeholder={value.model && engines.length === 0 ? 'Non répertoriée' : '— Choisir —'}
          onChange={(v) => onChange({ engine: v })}
        />
      </div>
    </div>
  )
}

function Select({
  label, value, options, onChange, disabled = false, placeholder = '— Choisir —',
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <div>
      <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function NumberSelect({
  label, value, options, onChange, disabled = false,
}: {
  label: string
  value: number | ''
  options: number[]
  onChange: (v: number | '') => void
  disabled?: boolean
}) {
  return (
    <div>
      <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</label>
      <select
        value={value === '' ? '' : String(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
        className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
      >
        <option value="">— Choisir —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
