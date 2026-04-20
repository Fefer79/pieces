'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { VEHICLE_BRANDS, getEngines, PART_CATALOG } from 'shared/constants'
import { Button } from '@/components/ui/button'

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

  // Condition and warranty (required at publication)
  const [condition, setCondition] = useState<'NEW' | 'USED' | 'REFURBISHED' | ''>('')
  const [warrantyMonths, setWarrantyMonths] = useState<string>('')

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
      if (condition) formData.append('condition', condition)
      if (warrantyMonths) formData.append('warrantyMonths', warrantyMonths)

      try {
        const res = await fetch('/api/v1/catalog/items/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })

        const body = await res.json()

        if (!res.ok) {
          if (body.error?.code === 'VENDOR_NOT_FOUND') {
            router.push('/vendors/onboarding')
            return
          }
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
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Boutique · Nouvelle annonce
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Ajouter des pièces</h1>
        <p className="mt-2 text-sm text-muted">
          Photographiez vos pièces — l&apos;IA identifie chaque pièce et pré-remplit la cascade. Vous contrôlez et publiez.
        </p>
      </div>

      {/* 1. Vehicle compatibility */}
      <FieldGroup title="Véhicule compatible">
        <Field id="brand" label="Marque">
          <select
            id="brand"
            value={brand}
            onChange={(e) => handleBrandChange(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">— Sélectionner une marque —</option>
            {brandNames.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </Field>
        {brand && (
          <Field id="model" label="Modèle">
            <select
              id="model"
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">— Sélectionner un modèle —</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
        )}
        {brand && model && years.length > 0 && (
          <Field id="year" label="Année">
            <select
              id="year"
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">— Sélectionner une année —</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </Field>
        )}
        {brand && model && engines.length > 0 && (
          <Field id="motor" label="Motorisation (optionnel)">
            <select
              id="motor"
              value={motor}
              onChange={(e) => setMotor(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">— Toutes —</option>
              {engines.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
        )}
      </FieldGroup>

      {/* 2. Optional info fields */}
      <FieldGroup title="Informations optionnelles">
        <Field id="partName" label="Nom de la pièce">
          <input
            id="partName"
            type="text"
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            placeholder="Ex : Alternateur Bosch"
            className={INPUT_CLASS}
          />
        </Field>
        <Field id="serialNumber" label="Numéro de série / référence OEM">
          <input
            id="serialNumber"
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="Ex : 0 986 042 131"
            className={`${INPUT_CLASS} font-mono`}
          />
        </Field>
        <div>
          <div className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Photo du numéro de série ou QR code
          </div>
          {serialPhotoPreview ? (
            <div className="flex items-center gap-3">
              <img
                src={serialPhotoPreview}
                alt="Aperçu numéro de série"
                className="h-16 w-16 rounded-sm border border-border object-cover"
              />
              <button
                type="button"
                onClick={clearSerialPhoto}
                className="text-sm text-error-fg hover:underline"
              >
                Supprimer
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-border-strong bg-card px-3 py-2.5 text-sm text-muted transition-colors hover:border-ink-2 hover:text-ink-2">
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
      </FieldGroup>

      {/* 2b. Condition and warranty (required) */}
      <FieldGroup
        title="État et garantie"
        required
        help="État et garantie sont obligatoires avant publication."
      >
        <div>
          <div className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            État de la pièce
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'NEW', label: 'Neuf', chipClass: 'bg-neuf-bg text-neuf-fg border-neuf-fg/30' },
              { value: 'USED', label: 'Occasion', chipClass: 'bg-occasion-bg text-occasion-fg border-occasion-fg/30' },
              { value: 'REFURBISHED', label: 'Reconditionné', chipClass: 'bg-reusine-bg text-reusine-fg border-reusine-fg/30' },
            ].map(({ value, label, chipClass }) => {
              const isActive = condition === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCondition(value as 'NEW' | 'USED' | 'REFURBISHED')}
                  className={`rounded-md border-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] transition-all ${
                    isActive
                      ? chipClass
                      : 'border-border bg-card text-muted hover:border-border-strong hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
        <Field id="warranty" label="Garantie vendeur">
          <select
            id="warranty"
            value={warrantyMonths}
            onChange={(e) => setWarrantyMonths(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">— Choisir la durée de garantie —</option>
            <option value="0">Sans garantie (vente en l&apos;état)</option>
            <option value="1">1 mois</option>
            <option value="3">3 mois</option>
            <option value="6">6 mois</option>
            <option value="12">1 an</option>
            <option value="24">2 ans</option>
            <option value="36">3 ans</option>
          </select>
        </Field>
      </FieldGroup>

      {/* 3. Upload area */}
      <label className="mb-5 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border-strong bg-card p-8 transition-all hover:border-ink-2 hover:bg-[rgba(0,35,102,0.03)]">
        <svg className="mb-2 h-10 w-10 text-muted-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-sm font-medium text-ink">
          {uploading ? 'Upload en cours…' : 'Appuyez pour prendre ou choisir des photos'}
        </span>
        <span className="mt-1 text-xs text-muted">JPEG, PNG ou WebP — max 5 MB</span>
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

      {/* 4. Part category cascade */}
      <FieldGroup title="Type de pièce">
        <Field id="partCategory" label="Catégorie">
          <select
            id="partCategory"
            value={partCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">— Sélectionner une catégorie —</option>
            {categoryNames.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        {partCategory && subcategories.length > 0 && (
          <Field id="partSubcategory" label="Sous-catégorie">
            <select
              id="partSubcategory"
              value={partSubcategory}
              onChange={(e) => setPartSubcategory(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">— Sélectionner une sous-catégorie —</option>
              {subcategories.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        )}
      </FieldGroup>

      {/* Progress */}
      {uploading && (
        <div className="mb-4 rounded-md border border-border bg-card p-3.5">
          <p className="text-sm font-medium text-ink-2">
            <span className="font-mono tabular">{uploads.length}/{totalSelected}</span> pièces traitées
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${totalSelected > 0 ? (uploads.length / totalSelected) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {/* Uploaded items list */}
      {uploads.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            {uploads.length} pièce{uploads.length > 1 ? 's' : ''} uploadée{uploads.length > 1 ? 's' : ''}
          </p>
          <div className="space-y-2">
            {uploads.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-md border border-success-fg/20 bg-success-bg p-2.5"
              >
                <span className="text-success-fg">✓</span>
                <span className="text-xs text-success-fg">
                  Fiche créée — identification IA en cours…
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 space-y-2.5">
        {uploads.length > 0 && !uploading && (
          <Button variant="accent" size="lg" block onClick={() => router.push('/vendors/catalog')}>
            Voir mon catalogue ({uploads.length} pièce{uploads.length > 1 ? 's' : ''} ajoutée{uploads.length > 1 ? 's' : ''})
          </Button>
        )}
        <Button variant="secondary" block onClick={() => router.push('/vendors/catalog')}>
          Retour au catalogue
        </Button>
      </div>
    </div>
  )
}

const INPUT_CLASS =
  'w-full rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]'
const SELECT_CLASS = INPUT_CLASS

function FieldGroup({
  title,
  required,
  help,
  children,
}: {
  title: string
  required?: boolean
  help?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-4 space-y-3 rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          {title}
        </p>
        {required && <span className="text-accent">*</span>}
      </div>
      {children}
      {help && <p className="text-xs text-muted">{help}</p>}
    </div>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
