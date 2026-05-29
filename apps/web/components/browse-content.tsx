'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSelectedVehicle } from '@/lib/selected-vehicle'
import { Price } from '@/components/ui/price'
import { VehicleTypeSelector } from '@/components/vehicle-type-selector'
import { PartSearchAutocomplete } from '@/components/part-search-autocomplete'
import { CategoryCarousel, type CategoryTile } from '@/components/ui/category-carousel'

// Onglets de la CARTE 1 — méthodes d'identification du véhicule.
// « Mon véhicule » est à gauche / actif par défaut (cf. demande produit).
const VEHICLE_TABS = ['Mon véhicule', 'Code VIN', 'WhatsApp'] as const
type VehicleTab = (typeof VEHICLE_TABS)[number]

const TAB_META: Record<VehicleTab, { icon: string; desc: string }> = {
  'Mon véhicule': { icon: '🚗', desc: 'Marque · modèle · année' },
  'Code VIN': { icon: '🔢', desc: '17 caractères' },
  WhatsApp: { icon: '💬', desc: '+225 07 09 02 17 08' },
}

const WA_NUMBER = '2250709021708'

// Catégories pour « Parcourir par catégorie » (affiché sous la sélection véhicule).
const CATEGORY_TILES_BASE: Array<{ id: string; title: string; emoji: string; gradient: string }> = [
  { id: 'freinage', title: 'Freinage', emoji: '🛞', gradient: 'linear-gradient(135deg,#D9764A 0%,#C25E2E 100%)' },
  { id: 'moteur', title: 'Moteur', emoji: '⚙️', gradient: 'linear-gradient(135deg,#00113A 0%,#002366 100%)' },
  { id: 'filtration', title: 'Filtration', emoji: '🧪', gradient: 'linear-gradient(135deg,#2F6F4F 0%,#1F4D38 100%)' },
  { id: 'suspension', title: 'Suspension', emoji: '🔩', gradient: 'linear-gradient(135deg,#5A4A8A 0%,#3D316B 100%)' },
  { id: 'electrique', title: 'Électrique & batterie', emoji: '🔋', gradient: 'linear-gradient(135deg,#B7873A 0%,#8C6325 100%)' },
  { id: 'eclairage', title: 'Éclairage & signalisation', emoji: '💡', gradient: 'linear-gradient(135deg,#1F2937 0%,#0B1220 100%)' },
  { id: 'distribution', title: 'Distribution', emoji: '⛓️', gradient: 'linear-gradient(135deg,#4A6B8A 0%,#2E4A66 100%)' },
  { id: 'demarrage', title: 'Démarrage & charge', emoji: '🔌', gradient: 'linear-gradient(135deg,#8A2A2A 0%,#5C1A1A 100%)' },
  { id: 'roues', title: 'Roues & pneus', emoji: '🏁', gradient: 'linear-gradient(135deg,#2C2C2C 0%,#0F0F0F 100%)' },
  { id: 'climatisation', title: 'Climatisation & chauffage', emoji: '❄️', gradient: 'linear-gradient(135deg,#3A8FB7 0%,#1F6A8C 100%)' },
  { id: 'carrosserie', title: 'Carrosserie extérieure', emoji: '🚗', gradient: 'linear-gradient(135deg,#6B7280 0%,#3F4753 100%)' },
  { id: 'fluides', title: 'Fluides & consommables', emoji: '🛢️', gradient: 'linear-gradient(135deg,#3A2F1F 0%,#1F1813 100%)' },
]

interface BrowseContentProps {
  variant?: 'mobile' | 'desktop'
}

export function BrowseContent({ variant = 'mobile' }: BrowseContentProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const vinFileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<VehicleTab>('Mon véhicule')

  // Recherche pièce (Carte 2)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string
      name: string | null
      category: string | null
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
        return { id: t.id, title: t.title, emoji: t.emoji, gradient: t.gradient, href: `/search?${qs.toString()}` }
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
          <button onClick={() => setActiveTab('Mon véhicule')} className="flex w-full items-center gap-2.5 text-left">
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
        {/* ───── CARTE 1 — Identifier le véhicule ───── */}
        <section className="rounded-lg border border-border bg-card p-4 lg:p-6">
          <h2 className="font-display text-lg text-ink lg:text-xl">1. Identifiez votre véhicule</h2>
          <p className="mt-1 text-[13px] text-muted">Choisissez la méthode qui vous convient.</p>

          {/* Sous-onglets */}
          <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-md border border-border">
            {VEHICLE_TABS.map((tab, i) => {
              const meta = TAB_META[tab]
              const active = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 text-center transition-colors ${
                    i < VEHICLE_TABS.length - 1 ? 'border-r border-border' : ''
                  } ${active ? 'bg-ink-2 text-white' : 'text-ink hover:bg-surface'}`}
                  style={{ minHeight: 48 }}
                >
                  <span className="text-[22px] leading-none lg:text-[26px]">{meta.icon}</span>
                  <span className="text-[13px] font-medium lg:text-sm">{tab}</span>
                  <span className={`hidden text-[11px] lg:block ${active ? 'text-white/70' : 'text-muted'}`}>{meta.desc}</span>
                </button>
              )
            })}
          </div>

          {/* Contenu onglet */}
          <div className="mt-5">
            {activeTab === 'Mon véhicule' && <VehicleTypeSelector />}

            {activeTab === 'Code VIN' && (
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

            {activeTab === 'WhatsApp' && (
              <div className="grid gap-4 lg:grid-cols-2">
                <a
                  href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Bonjour, je recherche une pièce auto. Je vous envoie une note vocale.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[88px] items-center justify-between rounded-lg border border-green-100 bg-green-50 py-3 pl-4 transition-transform active:scale-[0.98]"
                  style={{ paddingRight: 10 }}
                >
                  <div>
                    <p className="text-sm font-medium text-green-800">Recherche par note vocale</p>
                    <p className="text-xs text-muted">Décrivez la pièce par WhatsApp</p>
                  </div>
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0013.6 2.3A7 7 0 0019 12h-2zm-4 6.93V21h-2v-2.07A8.02 8.02 0 014.07 13H6.1a5.98 5.98 0 005.9 5 5.98 5.98 0 005.9-5h2.03A8.02 8.02 0 0113 18.93z" />
                    </svg>
                  </div>
                </a>
                <a
                  href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Bonjour, je recherche une pièce auto.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[88px] items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 py-3 pl-4 transition-transform active:scale-[0.98]"
                  style={{ paddingRight: 10 }}
                >
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Recherche par message</p>
                    <p className="text-xs text-muted">Écrivez-nous sur WhatsApp</p>
                  </div>
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
                      <path d="M7 9h10v2H7zm0-3h10v2H7z" />
                    </svg>
                  </div>
                </a>
              </div>
            )}
          </div>
        </section>

        {/* ───── CARTE 2 — Trouver la pièce ───── */}
        <section className="mt-5 rounded-lg border border-border bg-card p-4 lg:p-6">
          <h2 className="font-display text-lg text-ink lg:text-xl">2. Trouvez votre pièce</h2>
          <p className="mt-1 text-[13px] text-muted">
            {vehicle
              ? `Recherche limitée aux pièces compatibles ${vehicle.brand} ${vehicle.model}${vehicle.year ? ` ${vehicle.year}` : ''}.`
              : 'Astuce : sélectionnez d’abord votre véhicule pour ne voir que les pièces compatibles.'}
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
              Photo de la pièce (IA)
            </button>
          </div>

          {/* Résultats de recherche */}
          {searching && <p className="mt-4 text-sm text-muted">Recherche…</p>}

          {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Résultats</h3>
              <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-4">
                {searchResults.map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-md border border-border bg-card p-3 transition-all hover:border-border-strong hover:shadow-sm">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-sm bg-surface">
                      {item.imageThumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageThumbUrl} alt={item.name ?? ''} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-2">—</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{item.name ?? 'Pièce'}</p>
                      <p className="text-xs text-muted">{item.category ?? '—'} · {item.vendor.shopName}</p>
                    </div>
                    {item.price != null && <Price amount={item.price} className="self-center text-sm" />}
                  </div>
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
