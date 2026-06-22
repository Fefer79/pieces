'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSelectedVehicle } from '@/lib/selected-vehicle'
import { Price } from '@/components/ui/price'
import { ConditionChip } from '@/components/ui/chip'
import { VehicleTypeSelector, TypeIcon } from '@/components/vehicle-type-selector'
import { PartSearchAutocomplete } from '@/components/part-search-autocomplete'
import { CategoryCarousel, type CategoryTile } from '@/components/ui/category-carousel'
import { VEHICLE_TYPES, DEFAULT_VEHICLE_TYPE } from 'shared/constants'
import type { VehicleTypeId } from 'shared/constants'

// Méthodes d'identification du véhicule (onglets de droite de la CARTE 1).
// « Sélectionnez votre {type} » est actif par défaut (cf. demande produit).
type IdentifyMethod = 'vehicle' | 'vin' | 'whatsapp'

const WA_NUMBER = '2250709021708'

// Catégories pour « Parcourir par catégorie » (affiché sous la sélection véhicule).
const CATEGORY_TILES_BASE: Array<{ id: string; title: string; image: string }> = [
  { id: 'freinage', title: 'Freinage', image: '/categories/freinage.png' },
  { id: 'moteur', title: 'Moteur', image: '/categories/moteur.png' },
  { id: 'filtration', title: 'Filtration', image: '/categories/filtres.png' },
  { id: 'suspension', title: 'Suspension', image: '/categories/suspension.png' },
  { id: 'electrique', title: 'Électrique & batterie', image: '/categories/batterie.png' },
  { id: 'eclairage', title: 'Éclairage & signalisation', image: '/categories/eclairage.png' },
  { id: 'distribution', title: 'Distribution', image: '/categories/distrib.png' },
  { id: 'demarrage', title: 'Démarrage & charge', image: '/categories/allumage.png' },
  { id: 'roues', title: 'Roues & pneus', image: '/categories/pneu.png' },
  { id: 'climatisation', title: 'Climatisation & chauffage', image: '/categories/clim.png' },
  { id: 'carrosserie', title: 'Carrosserie extérieure', image: '/categories/carrext.png' },
  { id: 'fluides', title: 'Fluides & consommables', image: '/categories/fluides.png' },
]

interface BrowseContentProps {
  variant?: 'mobile' | 'desktop'
}

export function BrowseContent({ variant = 'mobile' }: BrowseContentProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const vinFileInputRef = useRef<HTMLInputElement>(null)
  // Type de véhicule (rail de gauche) + méthode d'identification (onglets de droite).
  const [vehicleType, setVehicleType] = useState<VehicleTypeId>(DEFAULT_VEHICLE_TYPE)
  const [method, setMethod] = useState<IdentifyMethod>('vehicle')

  // Recherche pièce (Carte 2)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string
      name: string | null
      category: string | null
      condition: 'NEW' | 'USED' | 'REFURBISHED' | null
      oemReference: string | null
      price: number | null
      imageThumbUrl: string | null
      vendor: { shopName: string }
    }>
  >([])
  const [searching, setSearching] = useState(false)

  // Véhicule confirmé (persisté dans localStorage)
  const { vehicle: persistedVehicle, clearVehicle: clearPersistedVehicle } = useSelectedVehicle()
  const vehicle = persistedVehicle ? {
    brand: persistedVehicle.brand,
    model: persistedVehicle.model,
    year: persistedVehicle.year,
    motor: persistedVehicle.motor ?? '',
  } : null

  const [waMenuOpen, setWaMenuOpen] = useState(false)

  const clearVehicle = () => {
    clearPersistedVehicle()
  }

  // Recherche texte — STRICTE sur le véhicule si sélectionné (endpoint /parts),
  // sinon recherche globale (/search).
  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      let url: string
      if (vehicle?.brand) {
        const params = new URLSearchParams({ q, brand: vehicle.brand })
        if (vehicle.model) params.set('model', vehicle.model)
        if (vehicle.year) params.set('year', vehicle.year)
        url = `/api/v1/browse/parts?${params.toString()}`
      } else {
        url = `/api/v1/browse/search?q=${encodeURIComponent(q)}`
      }
      const res = await fetch(url)
      const body = await res.json()
      setSearchResults(body.data?.items ?? [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [vehicle?.brand, vehicle?.model, vehicle?.year])

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  // Tuiles catégories scopées au véhicule sélectionné → pièces compatibles.
  const categoryTiles: CategoryTile[] = vehicle
    ? CATEGORY_TILES_BASE.map((t) => {
        const qs = new URLSearchParams({ brand: vehicle.brand, category: t.title })
        if (vehicle.model) qs.set('model', vehicle.model)
        if (vehicle.year) qs.set('year', vehicle.year)
        return { id: t.id, title: t.title, image: t.image, href: `/search?${qs.toString()}` }
      })
    : []

  return (
    <div className="bg-surface">
      {/* Véhicule sélectionné / invite */}
      <div
        className={`mx-auto flex max-w-[1280px] items-center justify-between gap-3 rounded-md border-2 px-4 py-2.5 lg:px-5 ${
          vehicle
            ? 'border-ink-2 bg-[rgba(0,35,102,0.04)]'
            : 'border-accent bg-[rgba(255,107,0,0.06)]'
        }`}
        style={{ minHeight: 48 }}
      >
        {vehicle ? (
          <>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ink-2 text-white" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M3.5 13.5 5 9a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 9l1.5 4.5v5a1 1 0 0 1-1 1H18a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-5Zm3-1h11l-.9-2.7a.5.5 0 0 0-.5-.3H7.9a.5.5 0 0 0-.5.3l-.9 2.7Zm.5 3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                </svg>
              </span>
              <p className="truncate text-sm">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-2">Véhicule sélectionné · </span>
                <span className="font-semibold text-ink">
                  {vehicle.brand} · {vehicle.model}
                  {vehicle.year ? ` · ${vehicle.year}` : ''}
                  {vehicle.motor ? ` · ${vehicle.motor}` : ''}
                </span>
              </p>
            </div>
            <button
              onClick={clearVehicle}
              className="flex-shrink-0 p-1 text-muted-2 transition-colors hover:text-ink"
              aria-label="Supprimer le véhicule"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </>
        ) : (
          <button onClick={() => setMethod('vehicle')} className="flex w-full items-center gap-2.5 text-left">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white" aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M3.5 13.5 5 9a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 9l1.5 4.5v5a1 1 0 0 1-1 1H18a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-5Zm3-1h11l-.9-2.7a.5.5 0 0 0-.5-.3H7.9a.5.5 0 0 0-.5.3l-.9 2.7Zm.5 3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
              </svg>
            </span>
            <span className="truncate text-sm">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-accent">Sélectionnez votre véhicule · </span>
              <span className="text-ink">Marque · Modèle · Année · Motorisation</span>
            </span>
          </button>
        )}
      </div>

      <div className="mx-auto max-w-md px-4 py-6 lg:max-w-[1280px] lg:px-0">
       <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* ───── CARTE 1 — Identifier le véhicule ───── */}
        <section className="rounded-lg border border-border bg-card p-4 lg:p-6">
          <h2 className="flex items-center gap-2.5 font-display text-lg text-ink lg:text-xl">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ink-2 font-sans text-sm font-semibold text-white">1</span>
            Identifiez votre véhicule
          </h2>

          {/* Bloc unique : rail de types (gauche) + onglets méthode & contenu (droite) */}
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:gap-5">
            {/* Rail de types — horizontal sur mobile, vertical sur desktop */}
            <div
              role="tablist"
              aria-label="Type de véhicule"
              className="flex flex-row gap-2 overflow-x-auto overflow-y-hidden lg:flex-col lg:overflow-x-visible lg:gap-1.5 lg:border-r lg:border-border lg:pr-4"
            >
              {VEHICLE_TYPES.map((t) => {
                const active = t.id === vehicleType
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setVehicleType(t.id)
                      setMethod('vehicle')
                    }}
                    title={t.label}
                    className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-md px-3 py-2 transition-colors lg:w-[92px] lg:flex-none ${
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

            {/* Droite : onglets méthode + contenu */}
            <div className="min-w-0 flex-1">
              <div role="tablist" aria-label="Méthode d'identification" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border lg:overflow-x-visible">
                {([
                  { id: 'vehicle' as const, label: 'Mon véhicule' },
                  { id: 'vin' as const, label: 'Code VIN' },
                  { id: 'whatsapp' as const, label: 'WhatsApp' },
                ]).map((m) => {
                  const active = method === m.id
                  return (
                    <button
                      key={m.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setMethod(m.id)}
                      className={`relative -mb-px flex-shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors lg:flex-1 lg:text-center lg:text-sm ${
                        active ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
                      }`}
                      style={{ minHeight: 44 }}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>

              <div className="mt-5">
                {method === 'vehicle' && <VehicleTypeSelector type={vehicleType} />}

                {method === 'vin' && (
              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
                {variant === 'mobile' && (
                  <button
                    onClick={() => router.push('/browse/vin')}
                    className="flex min-h-[140px] items-center justify-center rounded-md border border-border bg-surface px-4 py-4 text-center transition-all hover:border-border-strong hover:shadow-sm active:scale-[0.98]"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                          <path fillRule="evenodd" d="M4.5 3.75a3 3 0 00-3 3v10.5a3 3 0 003 3h15a3 3 0 003-3V6.75a3 3 0 00-3-3h-15zm4.125 3a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zm-3.873 8.703a4.126 4.126 0 017.746 0 .75.75 0 01-.351.92 7.47 7.47 0 01-3.522.877 7.47 7.47 0 01-3.522-.877.75.75 0 01-.351-.92zM15 8.25a.75.75 0 000 1.5h3.75a.75.75 0 000-1.5H15zM14.25 12a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H15a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3.75a.75.75 0 000-1.5H15z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-ink">Scanner le VIN</p>
                      <p className="text-xs text-muted">Scanner avec la caméra</p>
                    </div>
                  </button>
                )}

                <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-md border border-border bg-surface px-4 py-4 text-center">
                  <p className="text-sm font-medium text-ink">Saisir le numéro VIN</p>
                  <input
                    type="text"
                    placeholder="Ex: JTDKN3DU5A0..."
                    maxLength={17}
                    className="font-mono w-full rounded-sm border border-border-strong bg-card px-4 py-3 text-center text-sm uppercase tracking-widest text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
                    style={{ minHeight: 48 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim()
                        if (val.length >= 11) router.push(`/browse/vin?code=${encodeURIComponent(val)}`)
                      }
                    }}
                  />
                  <p className="text-xs text-muted">17 caractères — visible sur la carte grise ou le châssis</p>
                </div>

                {variant === 'desktop' && (
                  <>
                    <input
                      ref={vinFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) router.push('/browse/vin')
                      }}
                    />
                    <button
                      onClick={() => vinFileInputRef.current?.click()}
                      className="flex min-h-[100px] items-center justify-center rounded-md border border-border bg-surface px-4 py-4 text-center transition-all hover:border-border-strong hover:shadow-sm active:scale-[0.98] lg:col-span-2"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                            <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-ink">Charger une photo de la carte grise</p>
                        <p className="text-xs text-muted">Le VIN sera extrait automatiquement</p>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}

                {method === 'whatsapp' && (
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Bonjour, voici la photo de ma carte grise.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[88px] items-center justify-between rounded-lg border border-green-100 bg-green-50 py-3 pl-4 transition-transform active:scale-[0.98]"
                style={{ paddingRight: 10 }}
              >
                <div>
                  <p className="text-sm font-medium text-green-800">Envoyez une photo de la carte grise sur WhatsApp.</p>
                </div>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                    <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.2.32.558.523.95.523h.3c1.796 0 3.241 1.51 3.241 3.3v7.2c0 1.79-1.445 3.3-3.241 3.3H5.241C3.445 20.1 2 18.59 2 16.8V9.6c0-1.79 1.445-3.3 3.241-3.3h.3c.392 0 .75-.203.95-.523l.821-1.317a2.616 2.616 0 012.332-1.39zM12 10.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd" />
                  </svg>
                </div>
              </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ───── CARTE 2 — Trouver la pièce ───── */}
        <section className="rounded-lg border border-border bg-card p-4 lg:p-6">
          <h2 className="flex items-center gap-2.5 font-display text-lg text-ink lg:text-xl">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ink-2 font-sans text-sm font-semibold text-white">2</span>
            Trouvez votre pièce
          </h2>
          {!vehicle && (
            <p className="mt-1 text-[13px] text-muted">
              Astuce : sélectionnez d’abord votre véhicule pour ne voir que les pièces compatibles.
            </p>
          )}
          <p className="mt-1 text-[13px] text-muted">
            Vous ne connaissez pas le nom de la pièce ? Prenez-la en photo, notre IA la reconnaît.
          </p>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-stretch">
            {/* Barre de recherche (nom ou référence OEM) */}
            <div className="flex-1">
              <PartSearchAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={setSearchQuery}
                vehicle={vehicle}
                placeholder="Nom de la pièce ou référence OEM…"
              />
            </div>

            {/* Photo de la pièce — identification IA */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) router.push('/browse/photo')
              }}
            />
            <button
              onClick={() => (variant === 'desktop' ? fileInputRef.current?.click() : router.push('/browse/photo'))}
              className="flex items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-4 py-3 text-sm font-medium text-ink transition-all hover:border-ink-2 hover:shadow-sm active:scale-[0.98] lg:w-auto"
              style={{ minHeight: 48 }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                  <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.2.32.558.523.95.523h.3c1.796 0 3.241 1.51 3.241 3.3v7.2c0 1.79-1.445 3.3-3.241 3.3H5.241C3.445 20.1 2 18.59 2 16.8V9.6c0-1.79 1.445-3.3 3.241-3.3h.3c.392 0 .75-.203.95-.523l.821-1.317a2.616 2.616 0 012.332-1.39zM12 10.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd" />
                </svg>
              </span>
              Photo IA
            </button>
          </div>

          {/* Résultats de recherche */}
          {searching && <p className="mt-4 text-sm text-muted">Recherche…</p>}

          {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Résultats</h3>
              <div className="grid gap-3">
                {searchResults.map((item) => (
                  <Link
                    key={item.id}
                    href={`/produit/${item.id}`}
                    className="flex gap-3 rounded-md border border-border bg-card p-3 transition-all hover:border-border-strong hover:shadow-sm"
                  >
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-sm bg-surface">
                      {item.imageThumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageThumbUrl} alt={item.name ?? ''} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-2">—</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink">{item.name ?? 'Pièce'}</p>
                        {item.condition && <ConditionChip condition={item.condition} />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {item.category ?? '—'} · {item.vendor.shopName}
                        {item.oemReference ? (
                          <span className="font-mono text-muted-2"> · {item.oemReference}</span>
                        ) : null}
                      </p>
                    </div>
                    {item.price != null && <Price amount={item.price} className="self-center text-sm" />}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
            <div className="mt-4 rounded-md border border-border bg-surface p-6 text-center">
              <p className="text-sm text-muted">
                {vehicle
                  ? `Aucune pièce compatible trouvée pour votre ${vehicle.brand} ${vehicle.model}.`
                  : `Aucun résultat pour « ${searchQuery} »`}
              </p>
              <p className="mt-1 text-xs text-muted-2">Essayez un autre terme ou contactez-nous via WhatsApp.</p>
            </div>
          )}
        </section>
       </div>

        {/* ───── Parcourir par catégorie — seulement après sélection du véhicule ───── */}
        {vehicle && (
          <section className="mt-8">
            <CategoryCarousel
              tiles={categoryTiles}
              heading={`Parcourir par catégorie · ${vehicle.brand} ${vehicle.model}`}
            />
          </section>
        )}
      </div>

      {/* WhatsApp FAB */}
      <div className="fixed bottom-20 right-4 z-50 lg:bottom-6">
        {waMenuOpen && (
          <div className="mb-3 flex flex-col gap-2">
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Bonjour, je voudrais commander une pièce par note vocale.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-card px-4 py-2 text-sm font-medium text-ink shadow-md transition-transform active:scale-95"
              style={{ minHeight: 48, display: 'flex', alignItems: 'center' }}
              onClick={() => setWaMenuOpen(false)}
            >
              🎙️ Note vocale
            </a>
            <a
              href={`https://wa.me/${WA_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-card px-4 py-2 text-sm font-medium text-ink shadow-md transition-transform active:scale-95"
              style={{ minHeight: 48, display: 'flex', alignItems: 'center' }}
              onClick={() => setWaMenuOpen(false)}
            >
              💬 Discuter
            </a>
          </div>
        )}
        <button
          onClick={() => setWaMenuOpen(!waMenuOpen)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform active:scale-95"
          aria-label="WhatsApp"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
