'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { VEHICLE_BRANDS, getEngines, PART_CATALOG } from 'shared/constants'

type SupabaseClient = ReturnType<typeof createClient>

interface UploadedItem {
  id: string
  status: string
  imageOriginalUrl: string | null
}

export default function VendorCatalogUploadPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const serialPhotoInputRef = useRef<HTMLInputElement>(null)

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [uploads, setUploads] = useState<UploadedItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalSelected, setTotalSelected] = useState(0)

  // Vehicle compatibility (cascade)
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [motor, setMotor] = useState('')

  // Part category (cascade)
  const [partCategory, setPartCategory] = useState('')
  const [partSubcategory, setPartSubcategory] = useState('')

  // Optional info fields
  const [partName, setPartName] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [serialPhoto, setSerialPhoto] = useState<File | null>(null)
  const [serialPhotoPreview, setSerialPhotoPreview] = useState<string | null>(null)

  // Derived data for vehicle cascade
  const brandNames = useMemo(() => Object.keys(VEHICLE_BRANDS).sort(), [])
  const models = useMemo(
    () => (brand ? Object.keys(VEHICLE_BRANDS[brand]?.models ?? {}).sort() : []),
    [brand],
  )
  const years = useMemo(() => {
    if (!brand || !model) return [] as number[]
    const ys = VEHICLE_BRANDS[brand]?.models[model] ?? []
    return [...ys].sort((a, b) => b - a)
  }, [brand, model])
  const engines = useMemo(
    () => (brand && model ? getEngines(brand, model) : []),
    [brand, model],
  )

  // Derived data for part cascade
  const categoryNames = useMemo(() => Object.keys(PART_CATALOG), [])
  const subcategories = useMemo(
    () => (partCategory ? PART_CATALOG[partCategory as keyof typeof PART_CATALOG] ?? [] : []),
    [partCategory],
  )

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  }, [])

  function handleSerialPhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo du numéro de série trop volumineuse (max 5 MB)')
      return
    }
    setSerialPhoto(file)
    setSerialPhotoPreview(URL.createObjectURL(file))
  }

  function clearSerialPhoto() {
    setSerialPhoto(null)
    if (serialPhotoPreview) URL.revokeObjectURL(serialPhotoPreview)
    setSerialPhotoPreview(null)
    if (serialPhotoInputRef.current) serialPhotoInputRef.current.value = ''
  }

  // Reset cascading selects
  function handleBrandChange(v: string) {
    setBrand(v)
    setModel('')
    setYear('')
    setMotor('')
  }
  function handleModelChange(v: string) {
    setModel(v)
    setYear('')
    setMotor('')
  }
  function handleYearChange(v: string) {
    setYear(v)
    setMotor('')
  }
  function handleCategoryChange(v: string) {
    setPartCategory(v)
    setPartSubcategory('')
  }

  function buildVehicleCompatibility(): string | undefined {
    if (!brand || !model) return undefined
    return [brand, model, year, motor].filter(Boolean).join(' ')
  }

  function buildCategoryString(): string | undefined {
    if (!partCategory) return undefined
    return partSubcategory ? `${partCategory} / ${partSubcategory}` : partCategory
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setError(null)
    setUploading(true)
    setTotalSelected(files.length)

    const token = await getAccessToken()
    if (!token) {
      setError('Session expirée. Veuillez vous reconnecter.')
      setUploading(false)
      return
    }

    const vehicleCompat = buildVehicleCompatibility()
    const categoryStr = buildCategoryString()

    // Upload files sequentially
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) continue

      // Validate size client-side
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} dépasse 5 MB — ignoré`)
        continue
      }

      const formData = new FormData()
      formData.append('file', file)
      if (partName.trim()) formData.append('name', partName.trim())
      if (serialNumber.trim()) formData.append('serialNumber', serialNumber.trim())
      if (serialPhoto) formData.append('serialPhoto', serialPhoto)
      if (vehicleCompat) formData.append('vehicleCompatibility', vehicleCompat)
      if (categoryStr) formData.append('category', categoryStr)

      try {
        const res = await fetch('/api/v1/catalog/items/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })

        const body = await res.json()

        if (!res.ok) {
          setError(body.error?.message ?? `Erreur lors de l'upload de ${file.name}`)
          continue
        }

        setUploads((prev) => [...prev, body.data])
      } catch {
        setError('Erreur réseau. Vérifiez votre connexion.')
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setPartName('')
    setSerialNumber('')
    clearSerialPhoto()
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-2 text-xl font-bold text-[#1A1A1A]">Ajouter des pièces</h1>
      <p className="mb-6 text-sm text-gray-600">
        Photographiez vos pièces — l&apos;IA identifiera chaque pièce automatiquement.
      </p>

      {/* 1. Vehicle compatibility (top) */}
      <div className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-700">Véhicule compatible</p>
        <div>
          <label htmlFor="brand" className="mb-1 block text-xs text-gray-500">Marque</label>
          <select
            id="brand"
            value={brand}
            onChange={(e) => handleBrandChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
          >
            <option value="">— Sélectionner une marque —</option>
            {brandNames.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        {brand && (
          <div>
            <label htmlFor="model" className="mb-1 block text-xs text-gray-500">Modèle</label>
            <select
              id="model"
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
            >
              <option value="">— Sélectionner un modèle —</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
        {brand && model && years.length > 0 && (
          <div>
            <label htmlFor="year" className="mb-1 block text-xs text-gray-500">Année</label>
            <select
              id="year"
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
            >
              <option value="">— Sélectionner une année —</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
        {brand && model && engines.length > 0 && (
          <div>
            <label htmlFor="motor" className="mb-1 block text-xs text-gray-500">Motorisation (optionnel)</label>
            <select
              id="motor"
              value={motor}
              onChange={(e) => setMotor(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
            >
              <option value="">— Toutes —</option>
              {engines.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Optional info fields */}
      <div className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-700">Informations optionnelles</p>
        <div>
          <label htmlFor="partName" className="mb-1 block text-xs text-gray-500">
            Nom de la pièce
          </label>
          <input
            id="partName"
            type="text"
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            placeholder="Ex : Alternateur Bosch"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
          />
        </div>
        <div>
          <label htmlFor="serialNumber" className="mb-1 block text-xs text-gray-500">
            Numéro de série / référence OEM
          </label>
          <input
            id="serialNumber"
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="Ex : 0 986 042 131"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-gray-500">Photo du numéro de série ou QR code</p>
          {serialPhotoPreview ? (
            <div className="flex items-center gap-3">
              <img
                src={serialPhotoPreview}
                alt="Aperçu numéro de série"
                className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
              />
              <button
                type="button"
                onClick={clearSerialPhoto}
                className="text-sm text-red-600 hover:underline"
              >
                Supprimer
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-sm text-gray-500 transition-colors hover:border-[#002366] hover:text-[#002366]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Ajouter une photo du numéro de série / QR code
              <input
                ref={serialPhotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleSerialPhotoSelect}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* 3. Upload area — main part photo */}
      <label className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition-colors hover:border-[#002366] hover:bg-blue-50">
        <svg className="mb-2 h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-sm font-medium text-gray-600">
          {uploading ? 'Upload en cours...' : 'Appuyez pour prendre ou choisir des photos'}
        </span>
        <span className="mt-1 text-xs text-gray-400">JPEG, PNG ou WebP — max 5 MB</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {/* 4. Part category cascade (bottom) */}
      <div className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-700">Type de pièce</p>
        <div>
          <label htmlFor="partCategory" className="mb-1 block text-xs text-gray-500">Catégorie</label>
          <select
            id="partCategory"
            value={partCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
          >
            <option value="">— Sélectionner une catégorie —</option>
            {categoryNames.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {partCategory && subcategories.length > 0 && (
          <div>
            <label htmlFor="partSubcategory" className="mb-1 block text-xs text-gray-500">Sous-catégorie</label>
            <select
              id="partSubcategory"
              value={partSubcategory}
              onChange={(e) => setPartSubcategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
            >
              <option value="">— Sélectionner une sous-catégorie —</option>
              {subcategories.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Progress counter */}
      {uploading && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-center">
          <p className="text-sm font-medium text-[#002366]">
            {uploads.length}/{totalSelected} pièces traitées
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-[#002366] transition-all"
              style={{ width: `${totalSelected > 0 ? (uploads.length / totalSelected) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-[#D32F2F]">{error}</p>}

      {/* Uploaded items list */}
      {uploads.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-gray-700">
            {uploads.length} pièce{uploads.length > 1 ? 's' : ''} uploadée{uploads.length > 1 ? 's' : ''}
          </p>
          <div className="space-y-2">
            {uploads.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-2">
                <span className="text-green-600">✅</span>
                <span className="text-xs text-gray-600">
                  Fiche créée — identification IA en cours...
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 space-y-3">
        {uploads.length > 0 && !uploading && (
          <button
            onClick={() => router.push('/vendors/catalog')}
            className="w-full rounded-lg bg-[#002366] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1565C0]"
          >
            Voir mon catalogue ({uploads.length} pièce{uploads.length > 1 ? 's' : ''} ajoutée{uploads.length > 1 ? 's' : ''})
          </button>
        )}
        <button
          onClick={() => router.push('/vendors/catalog')}
          className="w-full rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Retour au catalogue
        </button>
      </div>
    </div>
  )
}
