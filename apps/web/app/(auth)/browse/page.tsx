'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { VEHICLE_BRANDS } from 'shared/constants/vehicles'

const TABS = ['Photo', 'VIN', 'Recherche', 'Sélection'] as const
type Tab = (typeof TABS)[number]

const WA_NUMBER = '2250709021708'

export default function BrowsePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Recherche')

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

  // Véhicule confirmé (affiché au-dessus des tabs)
  const [vehicle, setVehicle] = useState<{
    brand: string
    model: string
    year: string
    motor: string
  } | null>(null)

  // WhatsApp FAB state
  const [waMenuOpen, setWaMenuOpen] = useState(false)

  const brandNames = Object.keys(VEHICLE_BRANDS).sort()
  const brandData = selectedBrand ? VEHICLE_BRANDS[selectedBrand] : undefined
  const models = brandData ? Object.keys(brandData.models).sort() : []
  const modelYears =
    brandData && selectedModel ? brandData.models[selectedModel] : undefined
  const years = modelYears ? [...modelYears].sort((a, b) => b - a) : []

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
      setVehicle({
        brand: selectedBrand,
        model: selectedModel,
        year: selectedYear,
        motor: selectedMotor,
      })
      setActiveTab('Recherche')
    }
  }

  const clearVehicle = () => {
    setVehicle(null)
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
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="flex justify-center bg-[#FAFAFA] px-4 pb-2 pt-4">
        <img
          src="/logo-pieces-light.svg"
          alt="PIÈCES.CI"
          className="h-20 w-auto"
        />
      </header>

      {/* Véhicule sélectionné / suggestion */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2" style={{ minHeight: 44 }}>
        {vehicle ? (
          <>
            <p className="truncate text-sm">
              <span className="text-gray-400">Véhicule : </span>
              <span className="font-medium text-[#1A1A1A]">
                {vehicle.brand} · {vehicle.model}{vehicle.year ? ` · ${vehicle.year}` : ''}{vehicle.motor ? ` · ${vehicle.motor}` : ''}
              </span>
            </p>
            <button
              onClick={clearVehicle}
              className="ml-2 flex-shrink-0 p-1 text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Supprimer le véhicule"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </>
        ) : (
          <button
            onClick={() => setActiveTab('Sélection')}
            className="w-full truncate text-left text-sm text-gray-400"
          >
            Sélectionnez votre véhicule (Marque · Modèle · Année · Motorisation)
          </button>
        )}
      </div>

      {/* Tabs */}
      <nav className="flex border-b border-gray-200 bg-[#FAFAFA]">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-[#1976D2] text-[#1976D2]'
                : 'text-gray-500'
            }`}
            style={{ minHeight: 48 }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Photo tab */}
        {activeTab === 'Photo' && (
          <div className="flex flex-col gap-4 py-6">
            {/* Conseil */}
            <div className="flex min-h-[140px] items-center justify-center rounded-lg border border-blue-100 bg-blue-50 px-4 py-4 text-center">
              <div className="flex flex-col items-center">
                <p className="text-sm font-medium text-[#1976D2]">
                  Vous pouvez photographier directement la pièce
                </p>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  Pour de meilleurs résultats, commencez par identifier votre
                  véhicule : photographiez l&#39;arrière de la{' '}
                  <strong>carte grise</strong> ou saisissez le{' '}
                  <strong>numéro VIN</strong> (onglet VIN).
                </p>
              </div>
            </div>

            {/* Carte prise de photo */}
            <button
              onClick={() => router.push('/browse/photo')}
              className="flex min-h-[140px] items-center justify-center rounded-lg border border-amber-100 bg-amber-50 px-4 py-4 text-center transition-transform active:scale-[0.98]"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1976D2] text-white">
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
                </div>
                <p className="text-sm font-medium text-amber-700">
                  Prendre une photo de la pièce
                </p>
                <p className="text-xs text-gray-500">
                  Identification par IA (Gemini)
                </p>
              </div>
            </button>
          </div>
        )}

        {/* VIN tab */}
        {activeTab === 'VIN' && (
          <div className="flex flex-col gap-4 py-6">
            <button
              onClick={() => router.push('/browse/vin')}
              className="flex min-h-[140px] items-center justify-center rounded-lg border border-amber-100 bg-amber-50 px-4 py-4 text-center transition-transform active:scale-[0.98]"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1976D2] text-white">
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
                <p className="text-sm font-medium text-amber-700">
                  Scanner le VIN
                </p>
                <p className="text-xs text-gray-500">
                  Scanner avec la caméra
                </p>
              </div>
            </button>

            {/* Carte saisie manuelle VIN */}
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-4 text-center">
              <p className="text-sm font-medium text-[#1976D2]">
                Saisir le numéro VIN
              </p>
              <input
                type="text"
                placeholder="Ex: JTDKN3DU5A0..."
                maxLength={17}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-sm uppercase tracking-widest focus:border-[#1976D2] focus:outline-none"
                style={{ minHeight: 48 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim()
                    if (val.length >= 11) {
                      router.push(`/browse/vin?code=${encodeURIComponent(val)}`)
                    }
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                17 caractères — visible sur la carte grise ou le châssis
              </p>
            </div>
          </div>
        )}

        {/* Texte tab */}
        {activeTab === 'Recherche' && (
          <div className="grid auto-rows-[1fr] gap-5">
            {/* Carte recherche par nom */}
            <div
              className="flex min-h-[88px] items-center justify-between rounded-lg border border-blue-100 bg-blue-50 py-3 pl-4"
              style={{ paddingRight: 10 }}
            >
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-sm font-medium text-[#1976D2]">Recherche par nom</p>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nom, référence OEM..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-[#1976D2] focus:outline-none"
                  style={{ minHeight: 48 }}
                />
              </div>
              <div className="ml-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1976D2] text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {searching && (
              <p className="text-sm text-gray-500">Recherche...</p>
            )}

            {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-gray-600">
                  Résultats
                </h2>
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {item.imageThumbUrl ? (
                        <img
                          src={item.imageThumbUrl}
                          alt={item.name ?? ''}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                          —
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.name ?? 'Pièce'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.category ?? '—'} · {item.vendor.shopName}
                      </p>
                    </div>
                    {item.price && (
                      <p className="text-sm font-semibold">
                        {item.price.toLocaleString('fr-FR')} F
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {searchQuery.trim().length >= 2 &&
              !searching &&
              searchResults.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
                  <p className="text-sm text-gray-500">
                    Aucun résultat pour &ldquo;{searchQuery}&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Essayez un autre terme ou naviguez par marque (onglet Sélection)
                  </p>
                </div>
              )}

            {/* Recherche par voice note */}
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Bonjour, je recherche une pièce auto. Je vous envoie une note vocale.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[88px] items-center justify-between rounded-lg border border-green-100 bg-green-50 py-3 pl-4 transition-transform active:scale-[0.98]"
              style={{ paddingRight: 10 }}
            >
              <div>
                <p className="text-sm font-medium text-green-800">Recherche par note vocale</p>
                <p className="text-xs text-gray-500">Décrivez la pièce par WhatsApp</p>
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
                <p className="text-sm font-medium text-emerald-800">Recherche par message</p>
                <p className="text-xs text-gray-500">Écrivez-nous sur WhatsApp</p>
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
          <div className="space-y-4 py-4">
            <p className="mb-2 text-sm text-gray-600">
              Sélectionnez votre véhicule
            </p>

            {/* Brand */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-[#1976D2] focus:outline-none"
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
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-[#1976D2] focus:outline-none disabled:opacity-50"
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
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-[#1976D2] focus:outline-none disabled:opacity-50"
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
            <input
              type="text"
              value={selectedMotor}
              onChange={(e) => setSelectedMotor(e.target.value)}
              disabled={!selectedYear}
              placeholder="Motorisation (ex: 1.6 HDi, 2.0 D-4D...)"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-[#1976D2] focus:outline-none disabled:opacity-50"
              style={{ minHeight: 48 }}
            />

            {/* Confirmer */}
            <button
              onClick={confirmVehicle}
              disabled={!selectedBrand || !selectedModel}
              className="w-full rounded-lg bg-[#1976D2] py-3 text-sm font-medium text-white transition-colors active:scale-[0.98] disabled:opacity-50"
              style={{ minHeight: 48 }}
            >
              Confirmer le véhicule
            </button>
          </div>
        )}
      </div>

      {/* WhatsApp FAB */}
      <div className="fixed bottom-20 right-4 z-50">
        {/* Mini-menu */}
        {waMenuOpen && (
          <div className="mb-3 flex flex-col gap-2">
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Bonjour, je voudrais commander une pièce par note vocale.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] shadow-lg transition-transform active:scale-95"
              style={{ minHeight: 48, display: 'flex', alignItems: 'center' }}
              onClick={() => setWaMenuOpen(false)}
            >
              🎙️ Note vocale
            </a>
            <a
              href={`https://wa.me/${WA_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] shadow-lg transition-transform active:scale-95"
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
