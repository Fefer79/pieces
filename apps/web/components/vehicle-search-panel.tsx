'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PartSearchAutocomplete } from '@/components/part-search-autocomplete'

// Vehicle-specific categories — these require knowing the make/model/year for
// compatibility. The 8 universal categories on /browse already cover consumables
// (pneus, huiles, batteries, ampoules…) that are selected by dimension/standard.
const VEHICLE_CATEGORIES = [
  { id: 'freinage', title: 'Freinage', emoji: '🛞', gradient: 'linear-gradient(135deg,#D9764A 0%,#C25E2E 100%)' },
  { id: 'moteur', title: 'Moteur', emoji: '⚙️', gradient: 'linear-gradient(135deg,#00113A 0%,#002366 100%)' },
  { id: 'filtration', title: 'Filtration', emoji: '🧪', gradient: 'linear-gradient(135deg,#2F6F4F 0%,#1F4D38 100%)' },
  { id: 'suspension', title: 'Suspension', emoji: '🔩', gradient: 'linear-gradient(135deg,#5A4A8A 0%,#3D316B 100%)' },
  { id: 'distribution', title: 'Distribution', emoji: '⛓️', gradient: 'linear-gradient(135deg,#4A6B8A 0%,#2E4A66 100%)' },
  { id: 'demarrage', title: 'Démarrage & charge', emoji: '🔌', gradient: 'linear-gradient(135deg,#8A2A2A 0%,#5C1A1A 100%)' },
  { id: 'climatisation', title: 'Climatisation & chauffage', emoji: '❄️', gradient: 'linear-gradient(135deg,#3A8FB7 0%,#1F6A8C 100%)' },
  { id: 'carrosserie', title: 'Carrosserie extérieure', emoji: '🚗', gradient: 'linear-gradient(135deg,#6B7280 0%,#3F4753 100%)' },
] as const

interface VehicleSearchPanelProps {
  brand: string
  model: string
  year?: string
}

export function VehicleSearchPanel({ brand, model, year }: VehicleSearchPanelProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const baseParams = () => {
    const qs = new URLSearchParams()
    qs.set('brand', brand)
    qs.set('model', model)
    if (year) qs.set('year', year)
    return qs
  }

  const goToSearch = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const qs = baseParams()
    qs.set('q', trimmed)
    router.push(`/search?${qs.toString()}`)
  }

  const categoryHref = (title: string) => {
    const qs = baseParams()
    qs.set('category', title)
    return `/search?${qs.toString()}`
  }

  return (
    <section
      aria-label={`Recherche de pièces pour ${brand} ${model}`}
      className="mt-5"
    >
      <h2 className="font-display text-lg tracking-[-0.01em] text-ink md:text-xl">
        Que cherchez-vous pour votre {brand} {model}
        {year ? ` ${year}` : ''} ?
      </h2>

      {/* Free-text search avec prédictions, restreint au véhicule */}
      <PartSearchAutocomplete
        value={query}
        onChange={setQuery}
        onSubmit={goToSearch}
        vehicle={{ brand, model, year }}
        placeholder="ex. plaquettes de frein, alternateur, courroie…"
        className="mt-3"
      />

      {/* Vehicle-specific categories */}
      <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
        Catégories spécifiques à votre véhicule
      </p>
      <div
        className="-mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 md:gap-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {VEHICLE_CATEGORIES.map((tile) => (
          <a
            key={tile.id}
            href={categoryHref(tile.title)}
            role="listitem"
            className="group relative flex w-[140px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow duration-150 hover:shadow-md md:w-[180px]"
          >
            <div
              className="relative aspect-[4/3] w-full overflow-hidden"
              style={{ backgroundImage: tile.gradient }}
            >
              <div
                className="flex h-full w-full items-center justify-center text-[44px] md:text-[56px]"
                aria-hidden
              >
                {tile.emoji}
              </div>
            </div>
            <div className="px-2.5 py-2 md:px-3 md:py-2.5">
              <div className="line-clamp-2 font-display text-[13px] leading-tight tracking-[-0.005em] text-ink md:text-[15px]">
                {tile.title}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
