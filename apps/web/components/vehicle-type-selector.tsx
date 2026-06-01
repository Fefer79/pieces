'use client'

import { useState } from 'react'
import { VEHICLE_BRANDS, getEngines, VEHICLE_TYPES, DEFAULT_VEHICLE_TYPE } from 'shared/constants'
import type { VehicleTypeId } from 'shared/constants'
import { useSelectedVehicle } from '@/lib/selected-vehicle'
import { Button } from '@/components/ui/button'

/** Icônes par clé `icon` de VEHICLE_TYPES (24×24, currentColor). */
const TYPE_ICONS: Record<string, React.ReactNode> = {
  car: (
    <path d="M3.5 13.5 5 9a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 9l1.5 4.5v5a1 1 0 0 1-1 1H18a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-5Zm3-1h11l-.9-2.7a.5.5 0 0 0-.5-.3H7.9a.5.5 0 0 0-.5.3l-.9 2.7Zm.5 3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
  ),
  motorcycle: (
    <path d="M5 18a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm14 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM5 13.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm14 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM14.5 6h2.7l.6 1.2 2 .5-.3 1.3-1.4-.3 1 2-1.6 2.1-1.3-1 1-1.3-1.2-2.4H10l-1.5 2H6a4 4 0 0 0-1.4.3l-.6-1.4A5.5 5.5 0 0 1 6 9.6h1.7l1.5-2h3.8V6Z" />
  ),
  truck: (
    <path d="M3 5h11a1 1 0 0 1 1 1v2h2.6a1 1 0 0 1 .8.4l2.4 3.2a1 1 0 0 1 .2.6V16a1 1 0 0 1-1 1h-1a3 3 0 1 1-6 0H9a3 3 0 1 1-6 0H2V6a1 1 0 0 1 1-1Zm12 5h4.5l-1.8-2.4a.5.5 0 0 0-.4-.2H15v2.6ZM6 15.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm12 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
  ),
  excavator: (
    <path d="M2 18h7v2H2v-2Zm9.5 0H22v2H11.5v-2ZM4 11h4v5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Zm5-5 1.6.8 4.4 4.2-.7 1.4L10 9V16H8.5V6H9Zm6.8 3.2 4 1.6-.6 1.4-4-1.6.6-1.4ZM6 12.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
  ),
}

export function TypeIcon({ icon }: { icon: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
      {TYPE_ICONS[icon] ?? TYPE_ICONS.car}
    </svg>
  )
}

interface VehicleTypeSelectorProps {
  /** Appelé après confirmation d'un véhicule complet. */
  onConfirmed?: () => void
  /**
   * Type piloté par le parent. Quand fourni, le rail interne de types est masqué
   * (le parent affiche son propre rail) et ce type pilote la cascade — le composant
   * ne rend alors que la cascade, sans sa carte englobante.
   */
  type?: VehicleTypeId
}

export function VehicleTypeSelector({ onConfirmed, type: controlledType }: VehicleTypeSelectorProps) {
  const { vehicle, setVehicle } = useSelectedVehicle()

  const [internalType, setInternalType] = useState<VehicleTypeId>(vehicle?.type ?? DEFAULT_VEHICLE_TYPE)
  const controlled = controlledType !== undefined
  const type = controlledType ?? internalType
  const setType = setInternalType
  const [brand, setBrand] = useState(vehicle?.brand ?? '')
  const [model, setModel] = useState(vehicle?.model ?? '')
  const [year, setYear] = useState(vehicle?.year ?? '')
  const [motor, setMotor] = useState(vehicle?.motor ?? '')

  const activeType = VEHICLE_TYPES.find((t) => t.id === type) ?? VEHICLE_TYPES[0]
  const available = activeType?.available ?? false

  const brandNames = Object.keys(VEHICLE_BRANDS).sort()
  const brandData = brand ? VEHICLE_BRANDS[brand] : undefined
  const models = brandData ? Object.keys(brandData.models).sort() : []
  const modelYears = brandData && model ? brandData.models[model] : undefined
  const years = modelYears ? [...modelYears].sort((a, b) => b - a) : []
  const engines = brand && model ? getEngines(brand, model) : []

  // Resets de cascade gérés dans les handlers (pas d'effet → pas de render en cascade).
  const changeType = (t: VehicleTypeId) => {
    setType(t)
    const avail = VEHICLE_TYPES.find((x) => x.id === t)?.available ?? false
    if (!avail) {
      setBrand('')
      setModel('')
      setYear('')
      setMotor('')
    }
  }
  const changeBrand = (v: string) => {
    setBrand(v)
    setModel('')
    setYear('')
    setMotor('')
  }
  const changeModel = (v: string) => {
    setModel(v)
    setYear('')
    setMotor('')
  }
  const changeYear = (v: string) => {
    setYear(v)
    setMotor('')
  }

  const confirm = () => {
    if (!available || !brand || !model) return
    setVehicle({ type, brand, model, year, motor })
    onConfirmed?.()
  }

  const selectClass =
    'w-full rounded-sm border border-border-strong bg-card px-4 py-3 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)] disabled:opacity-50'

  const content = (
    <div className="min-w-0 flex-1">
      {available ? (
        <>
          {!controlled && (
            <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Sélectionnez votre {activeType?.label.toLowerCase()}
            </p>
          )}
          <div className="space-y-3 lg:grid lg:grid-cols-4 lg:gap-3 lg:space-y-0">
                <select value={brand} onChange={(e) => changeBrand(e.target.value)} className={selectClass} style={{ minHeight: 48 }} aria-label="Marque">
                  <option value="">— Marque —</option>
                  {brandNames.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <select value={model} onChange={(e) => changeModel(e.target.value)} disabled={!brand} className={selectClass} style={{ minHeight: 48 }} aria-label="Modèle">
                  <option value="">— Modèle —</option>
                  {models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select value={year} onChange={(e) => changeYear(e.target.value)} disabled={!model} className={selectClass} style={{ minHeight: 48 }} aria-label="Année">
                  <option value="">— Année —</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select value={motor} onChange={(e) => setMotor(e.target.value)} disabled={!year || engines.length === 0} className={selectClass} style={{ minHeight: 48 }} aria-label="Motorisation">
                  <option value="">— Motorisation —</option>
                  {engines.map((eng) => (
                    <option key={eng} value={eng}>{eng}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4 lg:mt-5 lg:max-w-sm">
                <Button variant="accent" size="lg" block onClick={confirm} disabled={!brand || !model}>
                  Confirmer le véhicule
                </Button>
              </div>
            </>
          ) : (
            <div className="flex min-h-[140px] flex-col items-center justify-center rounded-md border border-dashed border-border-strong bg-surface px-6 py-8 text-center">
              <p className="text-sm font-medium text-ink">
                {activeType?.label} — bientôt disponible
              </p>
              <p className="mt-2 max-w-[42ch] text-[13px] leading-relaxed text-muted">
                Le catalogue {activeType?.label.toLowerCase()} arrive prochainement. En attendant, contactez-nous sur WhatsApp pour une recherche manuelle.
              </p>
            </div>
          )}
    </div>
  )

  // Mode contrôlé : le parent affiche son propre rail de types → on ne rend que la cascade.
  if (controlled) return content

  return (
    <div className="rounded-md border border-border bg-card p-3 lg:p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
        {/* Rail de types — horizontal sur mobile, vertical sur desktop */}
        <div
          role="tablist"
          aria-label="Type de véhicule"
          className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:gap-1.5 lg:border-r lg:border-border lg:pr-4"
        >
          {VEHICLE_TYPES.map((t) => {
            const active = t.id === type
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => changeType(t.id)}
                title={t.label}
                className={`flex flex-shrink-0 flex-col items-center justify-center gap-1 rounded-md px-3 py-2 transition-colors lg:w-[88px] ${
                  active ? 'bg-ink-2 text-white' : 'text-ink hover:bg-surface'
                }`}
                style={{ minHeight: 48, minWidth: 56 }}
              >
                <TypeIcon icon={t.icon} />
                <span className="text-[11px] font-medium leading-tight">{t.label}</span>
              </button>
            )
          })}
        </div>

        {content}
      </div>
    </div>
  )
}
