'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { VEHICLE_BRANDS, getEngines } from 'shared/constants/vehicles'
import { useSelectedVehicle } from '@/lib/selected-vehicle'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/ui/price'

const TABS = ['Photo', 'VIN', 'Sélection', 'WhatsApp'] as const
type Tab = (typeof TABS)[number]

const TAB_META: Record<Tab, { icon: string; desc: string }> = {
  Photo: { icon: '📷', desc: 'IA identifie en 3s' },
  VIN: { icon: '🔢', desc: '17 caractères' },
  Sélection: { icon: '🚗', desc: 'Marque · modèle · année' },
  WhatsApp: { icon: '💬', desc: '+225 07 09 02 17 08' },
}

const WA_NUMBER = '2250709021708'

interface BrowseContentProps {
  variant?: 'mobile' | 'desktop'
}

export function BrowseContent({ variant = 'mobile' }: BrowseContentProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const vinFileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Photo')

  // Text search state
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

  // Sélection dropdown state
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMotor, setSelectedMotor] = useState('')

  // Véhicule confirmé (persisté dans localStorage)
  const { vehicle: persistedVehicle, setVehicle: persistVehicle, clearVehicle: clearPersistedVehicle } = useSelectedVehicle()
  const vehicle = persistedVehicle ? {
    brand: persistedVehicle.brand,
    model: persistedVehicle.model,
    year: persistedVehicle.year,
    motor: persistedVehicle.motor ?? '',
  } : null

  // WhatsApp FAB state
  const [waMenuOpen, setWaMenuOpen] = useState(false)

  const brandNames = Object.keys(VEHICLE_BRANDS).sort()
  const brandData = selectedBrand ? VEHICLE_BRANDS[selectedBrand] : undefined
  const models = brandData ? Object.keys(brandData.models).sort() : []
  const modelYears =
    brandData && selectedModel ? brandData.models[selectedModel] : undefined
  const years = modelYears ? [...modelYears].sort((a, b) => b - a) : []
  const engines =
    selectedBrand && selectedModel
      ? getEngines(selectedBrand, selectedModel)
      : []

  // Reset cascading selects
  useEffect(() => {
    setSelectedModel('')
    setSelectedYear('')
    setSelectedMotor('')
  }, [selectedBrand])

  useEffect(() => {
    setSelectedYear('')
    setSelectedMotor('')
  }, [selectedModel])

  useEffect(() => {
    setSelectedMotor('')
  }, [selectedYear])

  const confirmVehicle = () => {
    if (selectedBrand && selectedModel) {
      persistVehicle({
        brand: selectedBrand,
        model: selectedModel,
        year: selectedYear,
        motor: selectedMotor,
      })
      setActiveTab('WhatsApp')
    }
  }

  const clearVehicle = () => {
    clearPersistedVehicle()
    setSelectedBrand('')
    setSelectedModel('')
    setSelectedYear('')
    setSelectedMotor('')
  }

  // Text search
  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(
        `/api/v1/browse/search?q=${encodeURIComponent(q)}`,
      )
      const body = await res.json()
      setSearchResults(body.data?.items ?? [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  return (
    <div className="bg-surface">
      {/* Véhicule sélectionné / suggestion */}
      <div
        className="mx-auto flex max-w-[1280px] items-center justify-between rounded-md border border-border bg-card px-4 py-2 lg:px-5"
        style={{ minHeight: 44 }}
      >
        {vehicle ? (
          <>
            <p className="truncate text-sm">
              <span className="text-muted">Véhicule : </span>
              <span className="font-medium text-ink">
                {vehicle.brand} · {vehicle.model}
                {vehicle.year ? ` · ${vehicle.year}` : ''}
                {vehicle.motor ? ` · ${vehicle.motor}` : ''}
              </span>
            </p>
            <button
              onClick={clearVehicle}
              className="ml-2 flex-shrink-0 p-1 text-muted-2 transition-colors hover:text-ink"
              aria-label="Supprimer le véhicule"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </>
        ) : (
          <button
            onClick={() => setActiveTab('Sélection')}
            className="w-full truncate text-left text-sm text-muted-2"
          >
            Véhicule sélectionné (Marque-Modèle-Année-Motorisation)
          </button>
        )}
      </div>

      {/* Tabs — mobile: flat bar; desktop: richer 4-up card row */}
      {variant === 'desktop' ? (
        <div className="mx-auto max-w-[1280px] px-0 pt-6">
          <div className="grid grid-cols-4 overflow-hidden rounded-md border border-border bg-card">
            {TABS.map((tab, i) => {
              const meta = TAB_META[tab]
              const active = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex flex-col items-center gap-1.5 px-4 py-5 text-center transition-colors ${
                    i < TABS.length - 1 ? 'border-r border-border' : ''
                  } ${active ? 'bg-ink-2 text-white' : 'text-ink hover:bg-surface'}`}
                >
                  <span className="text-[26px] leading-none">{meta.icon}</span>
                  <span className="text-sm font-medium">
                    {tab === 'Sélection' ? 'Mon véhicule' : tab === 'Photo' ? 'Photo de la pièce' : tab === 'VIN' ? 'Code VIN' : tab}
                  </span>
                  <span className={`text-[11.5px] ${active ? 'text-white/70' : 'text-muted'}`}>
                    {meta.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <nav className="flex border-b border-border bg-card">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-ink-2 text-ink-2'
                  : 'text-muted hover:text-ink'
              }`}
              style={{ minHeight: 48 }}
            >
              {tab}
            </button>
          ))}
        </nav>
      )}

      {/* Tab content */}
      <div className="mx-auto max-w-md px-4 py-6 lg:max-w-[1280px] lg:px-0">
        {/* Photo tab */}
        {activeTab === 'Photo' && (
          <div className="mx-auto flex max-w-3xl flex-col gap-4 py-6">
            {/* Conseil — hidden when vehicle is selected */}
            {!vehicle && (
              <div className="flex min-h-[140px] items-center justify-center rounded-md border border-border bg-card px-5 py-4">
                <div className="flex max-w-[42ch] flex-col">
                  <p className="text-center text-sm font-medium text-accent">
                    Sélectionner le véhicule
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted [text-align:justify] [text-align-last:center] [hyphens:auto]">
                    Identifiez d&apos;abord votre véhicule pour de meilleurs
                    résultats. Plusieurs méthodes :{' '}
                    <strong className="text-ink">carte grise</strong>,{' '}
                    <strong className="text-ink">numéro VIN</strong>, menu déroulant ou{' '}
                    <strong className="text-ink">WhatsApp</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Hidden file input for desktop */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  // TODO: handle file upload for AI identification
                  router.push('/browse/photo')
                }
              }}
            />

            {/* Carte prise de photo / upload */}
            <button
              onClick={() => {
                if (variant === 'desktop') {
                  fileInputRef.current?.click()
                } else {
                  router.push('/browse/photo')
                }
              }}
              className="flex min-h-[140px] items-center justify-center rounded-md border border-border bg-card px-4 py-4 text-center transition-all hover:border-border-strong hover:shadow-sm active:scale-[0.98]"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white">
                  {variant === 'desktop' ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-6 w-6"
                    >
                      <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-6 w-6"
                    >
                      <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                      <path
                        fillRule="evenodd"
                        d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.2.32.558.523.95.523h.3c1.796 0 3.241 1.51 3.241 3.3v7.2c0 1.79-1.445 3.3-3.241 3.3H5.241C3.445 20.1 2 18.59 2 16.8V9.6c0-1.79 1.445-3.3 3.241-3.3h.3c.392 0 .75-.203.95-.523l.821-1.317a2.616 2.616 0 012.332-1.39zM12 10.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-sm font-medium text-ink">
                  {variant === 'desktop'
                    ? 'Charger une photo de la pièce'
                    : 'Prendre une photo de la pièce'}
                </p>
                <p className="text-xs text-muted">
                  Identification par IA
                </p>
              </div>
            </button>
          </div>
        )}

        {/* VIN tab */}
        {activeTab === 'VIN' && (
          <div className="mx-auto flex max-w-3xl flex-col gap-4 py-6 lg:grid lg:max-w-5xl lg:grid-cols-2 lg:items-start lg:gap-6">
            {/* Scanner VIN — mobile only */}
            {variant === 'mobile' && (
              <button
                onClick={() => router.push('/browse/vin')}
                className="flex min-h-[140px] items-center justify-center rounded-md border border-border bg-card px-4 py-4 text-center transition-all hover:border-border-strong hover:shadow-sm active:scale-[0.98]"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-6 w-6"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.5 3.75a3 3 0 00-3 3v10.5a3 3 0 003 3h15a3 3 0 003-3V6.75a3 3 0 00-3-3h-15zm4.125 3a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zm-3.873 8.703a4.126 4.126 0 017.746 0 .75.75 0 01-.351.92 7.47 7.47 0 01-3.522.877 7.47 7.47 0 01-3.522-.877.75.75 0 01-.351-.92zM15 8.25a.75.75 0 000 1.5h3.75a.75.75 0 000-1.5H15zM14.25 12a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H15a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3.75a.75.75 0 000-1.5H15z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-ink">
                    Scanner le VIN
                  </p>
                  <p className="text-xs text-muted">
                    Scanner avec la caméra
                  </p>
                </div>
              </button>
            )}

            {/* Carte saisie manuelle VIN */}
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-md border border-border bg-card px-4 py-4 text-center">
              <p className="text-sm font-medium text-ink">
                Saisir le numéro VIN
              </p>
              <input
                type="text"
                placeholder="Ex: JTDKN3DU5A0..."
                maxLength={17}
                className="font-mono w-full rounded-sm border border-border-strong bg-card px-4 py-3 text-center text-sm uppercase tracking-widest text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
                style={{ minHeight: 48 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim()
                    if (val.length >= 11) {
                      router.push(
                        `/browse/vin?code=${encodeURIComponent(val)}`,
                      )
                    }
                  }
                }}
              />
              <p className="text-xs text-muted">
                17 caractères — visible sur la carte grise ou le châssis
              </p>
            </div>

            {/* Desktop: upload carte grise */}
            {variant === 'desktop' && (
              <>
                <input
                  ref={vinFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      // TODO: handle carte grise upload
                      router.push('/browse/vin')
                    }
                  }}
                />
                <button
                  onClick={() => vinFileInputRef.current?.click()}
                  className="flex min-h-[100px] items-center justify-center rounded-md border border-border bg-card px-4 py-4 text-center transition-all hover:border-border-strong hover:shadow-sm active:scale-[0.98]"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-6 w-6"
                      >
                        <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-ink">
                      Charger une photo de la carte grise
                    </p>
                    <p className="text-xs text-muted">
                      Le VIN sera extrait automatiquement
                    </p>
                  </div>
                </button>
              </>
            )}
          </div>
        )}

        {/* WhatsApp tab */}
        {activeTab === 'WhatsApp' && (
          <div className="mx-auto grid max-w-3xl auto-rows-[1fr] gap-5 py-6 lg:max-w-5xl lg:grid-cols-2">
            {/* Recherche par voice note */}
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Bonjour, je recherche une pièce auto. Je vous envoie une note vocale.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[88px] items-center justify-between rounded-lg border border-green-100 bg-green-50 py-3 pl-4 transition-transform active:scale-[0.98]"
              style={{ paddingRight: 10 }}
            >
              <div>
                <p className="text-sm font-medium text-green-800">
                  Recherche par note vocale
                </p>
                <p className="text-xs text-muted">
                  Décrivez la pièce par WhatsApp
                </p>
              </div>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0013.6 2.3A7 7 0 0019 12h-2zm-4 6.93V21h-2v-2.07A8.02 8.02 0 014.07 13H6.1a5.98 5.98 0 005.9 5 5.98 5.98 0 005.9-5h2.03A8.02 8.02 0 0113 18.93z" />
                </svg>
              </div>
            </a>

            {/* Recherche par message WhatsApp */}
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Bonjour, je recherche une pièce auto.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[88px] items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 py-3 pl-4 transition-transform active:scale-[0.98]"
              style={{ paddingRight: 10 }}
            >
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  Recherche par message
                </p>
                <p className="text-xs text-muted">
                  Écrivez-nous sur WhatsApp
                </p>
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

        {/* Logos tab — cascading dropdowns */}
        {activeTab === 'Sélection' && (
          <div className="py-4 lg:py-6">
            <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Sélectionnez votre véhicule
            </p>

            <div className="space-y-3 lg:grid lg:grid-cols-4 lg:gap-3 lg:space-y-0">
            {/* Brand */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full rounded-sm border border-border-strong bg-card px-4 py-3 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)] disabled:opacity-50"
              style={{ minHeight: 48 }}
            >
              <option value="">— Marque —</option>
              {brandNames.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Model */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={!selectedBrand}
              className="w-full rounded-sm border border-border-strong bg-card px-4 py-3 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)] disabled:opacity-50"
              style={{ minHeight: 48 }}
            >
              <option value="">— Modèle —</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Year */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={!selectedModel}
              className="w-full rounded-sm border border-border-strong bg-card px-4 py-3 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)] disabled:opacity-50"
              style={{ minHeight: 48 }}
            >
              <option value="">— Année —</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* Motorisation */}
            <select
              value={selectedMotor}
              onChange={(e) => setSelectedMotor(e.target.value)}
              disabled={!selectedYear || engines.length === 0}
              className="w-full rounded-sm border border-border-strong bg-card px-4 py-3 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)] disabled:opacity-50"
              style={{ minHeight: 48 }}
            >
              <option value="">— Motorisation —</option>
              {engines.map((eng) => (
                <option key={eng} value={eng}>
                  {eng}
                </option>
              ))}
            </select>
            </div>

            {/* Confirmer */}
            <div className="mt-4 lg:mt-5 lg:max-w-sm">
              <Button
                variant="accent"
                size="lg"
                block
                onClick={confirmVehicle}
                disabled={!selectedBrand || !selectedModel}
              >
                Confirmer le véhicule
              </Button>
            </div>

            {/* Recherche par nom — visible après confirmation du véhicule */}
            {vehicle && (
              <>
                <div className="mt-2 border-t border-border pt-4">
                  <div
                    className="flex min-h-[88px] items-center justify-between rounded-md border border-border bg-card py-3 pl-4"
                    style={{ paddingRight: 10 }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-sm font-medium text-ink">
                        Recherche par nom
                      </p>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Nom, référence OEM..."
                        className="w-full rounded-sm border border-border-strong bg-card px-4 py-3 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
                        style={{ minHeight: 48 }}
                      />
                    </div>
                    <div className="ml-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {searching && (
                  <p className="text-sm text-muted">Recherche…</p>
                )}

                {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                      Résultats
                    </h2>
                    <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-4">
                      {searchResults.map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-3 rounded-md border border-border bg-card p-3 transition-all hover:border-border-strong hover:shadow-sm"
                        >
                          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-sm bg-surface">
                            {item.imageThumbUrl ? (
                              <img
                                src={item.imageThumbUrl}
                                alt={item.name ?? ''}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-muted-2">
                                —
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">
                              {item.name ?? 'Pièce'}
                            </p>
                            <p className="text-xs text-muted">
                              {item.category ?? '—'} · {item.vendor.shopName}
                            </p>
                          </div>
                          {item.price != null && (
                            <Price amount={item.price} className="self-center text-sm" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery.trim().length >= 2 &&
                  !searching &&
                  searchResults.length === 0 && (
                    <div className="rounded-md border border-border bg-card p-6 text-center">
                      <p className="text-sm text-muted">
                        Aucun résultat pour «&nbsp;{searchQuery}&nbsp;»
                      </p>
                      <p className="mt-1 text-xs text-muted-2">
                        Essayez un autre terme
                      </p>
                    </div>
                  )}
              </>
            )}
          </div>
        )}
      </div>

      {/* WhatsApp FAB */}
      <div className="fixed bottom-20 right-4 z-50 lg:bottom-6">
        {/* Mini-menu */}
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

        {/* FAB button */}
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
