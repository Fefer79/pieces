'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { liaisonFetch, liaisonUpload } from '@/lib/liaison-api'
import { catalogFetch, catalogUpload } from '@/lib/catalog-api'
import {
  WARRANTY_UNITS,
  type WarrantyUnit,
  ABIDJAN_COMMUNES,
  PART_CATALOG,
  VEHICLE_BRANDS,
  getEngines,
} from 'shared/constants'

const CONDITIONS = [
  { value: 'NEW', label: 'Neuf' },
  { value: 'USED', label: 'Occasion' },
  { value: 'REFURBISHED', label: 'Ré-usiné' },
] as const
type Condition = (typeof CONDITIONS)[number]['value']

const PART_SOURCES = [
  { value: 'OEM', label: 'OEM' },
  { value: 'AFTERMARKET', label: 'Aftermarket' },
  { value: 'COMPATIBLE', label: 'Compatible' },
] as const
type PartSource = (typeof PART_SOURCES)[number]['value']

const CATEGORY_NAMES = Object.keys(PART_CATALOG)

/**
 * La catégorie est stockée dans un seul champ texte sous la forme
 * « Catégorie / Sous-catégorie ». On décompose ici pour piloter la cascade des
 * deux sélecteurs, et on recompose au submit.
 */
function splitCategory(raw?: string | null): { cat: string; sub: string } {
  if (!raw) return { cat: '', sub: '' }
  const idx = raw.indexOf(' / ')
  if (idx === -1) return { cat: raw, sub: '' }
  return { cat: raw.slice(0, idx), sub: raw.slice(idx + 3) }
}

export interface FitmentEntry {
  brand: string
  model?: string | null
  yearFrom?: number | null
  yearTo?: number | null
  engine?: string | null
}

/** Même convention de clés que CatalogItemPhoto côté API. */
export interface PartPhoto {
  urlOriginal: string
  urlThumb?: string | null
  urlSmall?: string | null
  urlMedium?: string | null
  urlLarge?: string | null
}

const MAX_PHOTOS = 3

interface OemScanResult {
  oemReferences: string[]
  partName: string | null
  partBrand: string | null
  compatibilities: {
    brand: string
    model: string | null
    yearFrom: number | null
    yearTo: number | null
    engine: string | null
  }[]
  confidence: number
}

export interface PartFormInitial {
  name?: string
  category?: string | null
  oemReference?: string | null
  vehicleCompatibility?: string | null
  fitments?: FitmentEntry[]
  photos?: PartPhoto[]
  price?: number | null
  condition?: Condition
  partSource?: PartSource | null
  warrantyValue?: number | null
  warrantyUnit?: WarrantyUnit | null
  commissionAmount?: number | null
  inStock?: boolean
  stockQuantity?: number | null
  lowStockThreshold?: number | null
  imageOriginalUrl?: string | null
  imageThumbUrl?: string | null
}

interface ImageUrls {
  imageOriginalUrl?: string
  imageThumbUrl?: string
  imageSmallUrl?: string
  imageMediumUrl?: string
  imageLargeUrl?: string
}

interface Props {
  /**
   * 'liaison' : publie au nom d'un vendeur géré (API /liaison).
   * 'vendor'  : le vendeur publie dans son propre catalogue (API /catalog) —
   *             même processus, sans les attributs liaison. Mode 'create' seulement.
   */
  actor: 'liaison' | 'vendor'
  mode: 'create' | 'edit'
  /** Vendeur cible (liaison, modes 'edit' et 'create' classique). Omis en saisie rapide et côté vendeur. */
  vendorId?: string
  partId?: string
  initial?: PartFormInitial
  /** Saisie rapide (liaison) : capture le vendeur tiers (nom, contact, location) + publie l'annonce en une étape. */
  quickVendor?: boolean
  /** Vendeur, mode 'edit' d'un brouillon : publie la fiche juste après l'enregistrement. */
  publishAfterSave?: boolean
}

export function PartForm({ actor, mode, vendorId, partId, initial, quickVendor, publishAfterSave }: Props) {
  const router = useRouter()
  const apiFetch = actor === 'liaison' ? liaisonFetch : catalogFetch
  const apiUpload = actor === 'liaison' ? liaisonUpload : catalogUpload
  const imagePath = actor === 'liaison' ? '/parts/image' : '/items/image'
  const oemScanPath = actor === 'liaison' ? '/parts/oem-scan' : '/items/oem-scan'
  // Champs vendeur (saisie rapide uniquement)
  const [vShopName, setVShopName] = useState('')
  const [vContactName, setVContactName] = useState('')
  const [vPhone, setVPhone] = useState('+225')
  const [vCommune, setVCommune] = useState('')
  const [vAddress, setVAddress] = useState('')
  const [name, setName] = useState(initial?.name ?? '')
  const initialCategory = useMemo(() => splitCategory(initial?.category), [initial?.category])
  const [partCategory, setPartCategory] = useState(initialCategory.cat)
  const [partSubcategory, setPartSubcategory] = useState(initialCategory.sub)
  const [oemReference, setOemReference] = useState(initial?.oemReference ?? '')
  const [vehicleCompatibility, setVehicleCompatibility] = useState(
    initial?.vehicleCompatibility ?? '',
  )
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '')
  const [condition, setCondition] = useState<Condition>(initial?.condition ?? 'USED')
  const [partSource, setPartSource] = useState<PartSource | ''>(initial?.partSource ?? '')
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initial?.lowStockThreshold != null ? String(initial.lowStockThreshold) : '',
  )
  const [warrantyValue, setWarrantyValue] = useState(
    initial?.warrantyValue != null ? String(initial.warrantyValue) : '',
  )
  const [warrantyUnit, setWarrantyUnit] = useState<WarrantyUnit>(
    initial?.warrantyUnit ?? 'MONTH',
  )

  const [commission, setCommission] = useState(
    initial?.commissionAmount != null ? String(initial.commissionAmount) : '',
  )
  const [inStock, setInStock] = useState(initial?.inStock ?? true)
  const [stockQuantity, setStockQuantity] = useState(
    initial?.stockQuantity != null ? String(initial.stockQuantity) : '',
  )
  // Quantité renseignée : inStock est dérivé côté serveur (>0), le toggle manuel
  // ne s'applique plus.
  const stockTracked = stockQuantity !== ''
  // Photos (max 3). Les anciennes annonces mono-photo n'ont pas de lignes
  // CatalogItemPhoto : on ressuscite la photo depuis les champs image* hérités.
  const [photos, setPhotos] = useState<PartPhoto[]>(() => {
    if (initial?.photos && initial.photos.length > 0) {
      // Ne garder que les URLs : l'API renvoie aussi id/position, que le
      // schéma de mise à jour n'accepte pas.
      return initial.photos.slice(0, MAX_PHOTOS).map((p) => ({
        urlOriginal: p.urlOriginal,
        urlThumb: p.urlThumb ?? null,
        urlSmall: p.urlSmall ?? null,
        urlMedium: p.urlMedium ?? null,
        urlLarge: p.urlLarge ?? null,
      }))
    }
    if (initial?.imageOriginalUrl) {
      return [{ urlOriginal: initial.imageOriginalUrl, urlThumb: initial.imageThumbUrl ?? null }]
    }
    return []
  })
  const [imgUploading, setImgUploading] = useState(false)
  const [imgError, setImgError] = useState<string | null>(null)

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // autorise re-sélection du même fichier après retrait
    if (files.length === 0) return
    setImgError(null)

    const room = MAX_PHOTOS - photos.length
    if (files.length > room) {
      setImgError(`Maximum ${MAX_PHOTOS} photos par pièce`)
    }
    const batch = files.slice(0, Math.max(0, room))
    if (batch.length === 0) return

    for (const file of batch) {
      if (file.size > 5 * 1024 * 1024) {
        setImgError('Image trop volumineuse (max 5 MB)')
        continue
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setImgError('Format accepté : JPEG, PNG ou WebP')
        continue
      }
      setImgUploading(true)
      const fd = new FormData()
      fd.append('file', file)
      const r = await apiUpload<ImageUrls>(imagePath, fd)
      if (!r.ok) {
        setImgError(r.message)
        continue
      }
      const { imageOriginalUrl, imageThumbUrl, imageSmallUrl, imageMediumUrl, imageLargeUrl } =
        r.data
      if (!imageOriginalUrl) continue
      setPhotos((prev) =>
        prev.length >= MAX_PHOTOS
          ? prev
          : [
              ...prev,
              {
                urlOriginal: imageOriginalUrl,
                urlThumb: imageThumbUrl ?? null,
                urlSmall: imageSmallUrl ?? null,
                urlMedium: imageMediumUrl ?? null,
                urlLarge: imageLargeUrl ?? null,
              },
            ],
      )
    }
    setImgUploading(false)
  }
  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
    setImgError(null)
  }

  const [fitments, setFitments] = useState<FitmentEntry[]>(initial?.fitments ?? [])
  const [fitBrand, setFitBrand] = useState('')
  const [fitModel, setFitModel] = useState('')
  const [fitYearFrom, setFitYearFrom] = useState('')
  const [fitYearTo, setFitYearTo] = useState('')
  const [fitEngine, setFitEngine] = useState('')

  const addFitment = () => {
    const brand = fitBrand.trim()
    if (brand.length < 1) return
    const yf = fitYearFrom ? Number(fitYearFrom) : null
    const yt = fitYearTo ? Number(fitYearTo) : null
    if (yf != null && yt != null && yf > yt) return
    setFitments((prev) => [
      ...prev,
      {
        brand,
        model: fitModel.trim() || null,
        yearFrom: yf,
        yearTo: yt,
        engine: fitEngine.trim() || null,
      },
    ])
    setFitBrand('')
    setFitModel('')
    setFitYearFrom('')
    setFitYearTo('')
    setFitEngine('')
  }
  const removeFitment = (idx: number) =>
    setFitments((prev) => prev.filter((_, i) => i !== idx))

  // Cascade véhicule pour la saisie d'une compatibilité (marque → modèle →
  // années → moteur).
  const fitBrandNames = useMemo(() => Object.keys(VEHICLE_BRANDS).sort(), [])
  const fitModels = useMemo(
    () => (fitBrand ? Object.keys(VEHICLE_BRANDS[fitBrand]?.models ?? {}).sort() : []),
    [fitBrand],
  )
  const fitYears = useMemo(() => {
    if (!fitBrand) return [] as number[]
    if (fitModel) return [...(VEHICLE_BRANDS[fitBrand]?.models[fitModel] ?? [])].sort((a, b) => b - a)
    // Marque seule : union des années de tous ses modèles.
    const set = new Set<number>()
    Object.values(VEHICLE_BRANDS[fitBrand]?.models ?? {}).forEach((ys) => ys.forEach((y) => set.add(y)))
    return [...set].sort((a, b) => b - a)
  }, [fitBrand, fitModel])
  const fitEngines = useMemo(
    () => (fitBrand && fitModel ? getEngines(fitBrand, fitModel) : []),
    [fitBrand, fitModel],
  )

  const handleFitBrandChange = (v: string) => {
    setFitBrand(v)
    setFitModel('')
    setFitYearFrom('')
    setFitYearTo('')
    setFitEngine('')
  }
  const handleFitModelChange = (v: string) => {
    setFitModel(v)
    setFitYearFrom('')
    setFitYearTo('')
    setFitEngine('')
  }

  // Scan d'étiquette OEM : Gemini lit les références (code-barres inclus) et
  // suggère les compatibilités véhicule, à relire avant publication.
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanSummary, setScanSummary] = useState<string | null>(null)

  const handleOemScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setScanError(null)
    setScanSummary(null)
    if (file.size > 5 * 1024 * 1024) {
      setScanError('Image trop volumineuse (max 5 MB)')
      return
    }
    setScanning(true)
    const fd = new FormData()
    fd.append('file', file)
    const r = await apiUpload<OemScanResult>(oemScanPath, fd)
    setScanning(false)
    if (!r.ok) {
      setScanError(r.message)
      return
    }
    const scan = r.data

    const refs = scan.oemReferences
    if (refs[0]) setOemReference(refs[0].slice(0, 80))

    // Compatibilités suggérées : ajoutées à la liste structurée, sans doublons.
    const key = (f: FitmentEntry) =>
      [f.brand, f.model ?? '', f.yearFrom ?? '', f.yearTo ?? '', f.engine ?? '']
        .join('|')
        .toLowerCase()
    const seen = new Set(fitments.map(key))
    const fresh = scan.compatibilities.filter((c) => !seen.has(key(c)))
    const added = fresh.length
    if (added > 0) setFitments((prev) => [...prev, ...fresh])

    // Texte libre de recherche : rempli seulement s'il est encore vide.
    if (!vehicleCompatibility && scan.compatibilities.length > 0) {
      const text = scan.compatibilities
        .map((c) =>
          [c.brand, c.model, c.yearFrom || c.yearTo ? `${c.yearFrom ?? ''}-${c.yearTo ?? ''}` : null]
            .filter(Boolean)
            .join(' '),
        )
        .join(', ')
        .slice(0, 255)
      setVehicleCompatibility(text)
    }

    if (!name && scan.partName) setName(scan.partName)

    const parts = [
      refs.length > 1 ? `${refs.length} références lues (${refs.join(', ')})` : `Référence lue : ${refs[0]}`,
      added > 0
        ? `${added} compatibilité${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''}`
        : 'aucune compatibilité connue',
    ]
    setScanSummary(`${parts.join(' — ')}. Vérifiez avant de publier.`)
  }

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cascade catégorie → sous-catégorie. On conserve une éventuelle valeur héritée
  // hors catalogue (édition d'anciennes annonces) pour ne pas la perdre.
  const categoryOptions = useMemo(
    () =>
      partCategory && !CATEGORY_NAMES.includes(partCategory)
        ? [partCategory, ...CATEGORY_NAMES]
        : CATEGORY_NAMES,
    [partCategory],
  )
  const subcategoryOptions = useMemo(() => {
    const subs = PART_CATALOG[partCategory as keyof typeof PART_CATALOG] ?? []
    return partSubcategory && !subs.includes(partSubcategory)
      ? [partSubcategory, ...subs]
      : subs
  }, [partCategory, partSubcategory])
  const categoryValue = partCategory
    ? partSubcategory
      ? `${partCategory} / ${partSubcategory}`
      : partCategory
    : undefined

  const handleCategoryChange = (v: string) => {
    setPartCategory(v)
    setPartSubcategory('')
  }

  // Aligné sur phoneSchema côté serveur : préfixe mobile ivoirien (01|05|07) obligatoire.
  const phoneValid = /^\+225(01|05|07)\d{8}$/.test(vPhone)
  const vendorValid =
    !quickVendor ||
    (vShopName.trim().length >= 2 &&
      vContactName.trim().length >= 2 &&
      phoneValid &&
      vCommune.length > 0)
  const valid = name.length >= 2 && vendorValid && !imgUploading && !scanning

  const cancelHref =
    actor === 'vendor'
      ? '/vendors/catalog'
      : quickVendor
        ? '/liaison/parts'
        : `/liaison/vendors/${vendorId}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    setError(null)

    const payload = {
      name,
      category: categoryValue,
      oemReference: oemReference || undefined,
      vehicleCompatibility: vehicleCompatibility || undefined,
      price: price ? Number(price) : undefined,
      condition,
      warrantyValue: warrantyValue ? Number(warrantyValue) : undefined,
      warrantyUnit: warrantyValue ? warrantyUnit : undefined,
      commissionAmount: commission ? Number(commission) : undefined,
      inStock,
      // Vide en édition = null (désactive le suivi) ; vide en création = non suivi.
      stockQuantity: stockTracked
        ? Number(stockQuantity)
        : mode === 'edit'
          ? null
          : undefined,
      fitments,
      // La liste remplace l'existant côté API ; les champs image* hérités sont
      // dérivés de la première photo (ou vidés si la liste est vide).
      photos,
      // Champs propres au flux vendeur (le schéma liaison ne les accepte pas).
      ...(actor === 'vendor' && {
        partSource: partSource || null,
        lowStockThreshold: lowStockThreshold !== '' ? Number(lowStockThreshold) : undefined,
      }),
      ...(quickVendor && {
        vendor: {
          shopName: vShopName.trim(),
          contactName: vContactName.trim(),
          phone: vPhone.trim(),
          commune: vCommune,
          address: vAddress.trim() || undefined,
        },
      }),
    }

    const path =
      actor === 'vendor'
        ? mode === 'create'
          ? '/items'
          : `/items/${partId}`
        : quickVendor
          ? '/parts/quick'
          : mode === 'create'
            ? `/vendors/${vendorId}/parts`
            : `/vendors/${vendorId}/parts/${partId}`
    const method = mode === 'create' || quickVendor ? 'POST' : 'PATCH'

    const r = await apiFetch<{ id: string; vendorId: string }>(path, {
      method,
      body: JSON.stringify(payload),
    })

    if (!r.ok) {
      setSubmitting(false)
      setError(r.message)
      return
    }

    // Brouillon vendeur (flux ajout par photos) : publier dans la foulée.
    if (actor === 'vendor' && publishAfterSave && partId) {
      const pub = await catalogFetch(`/items/${partId}/publish`, { method: 'POST' })
      if (!pub.ok) {
        setSubmitting(false)
        setError(`Modifications enregistrées, mais publication impossible : ${pub.message}`)
        return
      }
    }

    setSubmitting(false)
    router.push(
      actor === 'vendor'
        ? '/vendors/catalog'
        : `/liaison/vendors/${quickVendor ? r.data.vendorId : vendorId}`,
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-md border border-[#D32F2F]/40 bg-[#D32F2F]/5 p-3 text-sm text-[#D32F2F]">
          {error}
        </p>
      )}

      {quickVendor && (
        <fieldset className="space-y-4 rounded-md border border-border bg-card p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Vendeur tiers</legend>
          <p className="text-xs text-muted">
            Obligatoire pour publier au nom d&apos;un vendeur. Ces informations restent
            réservées à vous et à l&apos;administration.
          </p>

          <Field label="Nom du vendeur / boutique" required>
            <input
              value={vShopName}
              onChange={(e) => setVShopName(e.target.value)}
              className="part-input"
              placeholder="Ex : Casse Auto Adjamé"
            />
          </Field>

          <Field label="Personne à contacter" required>
            <input
              value={vContactName}
              onChange={(e) => setVContactName(e.target.value)}
              className="part-input"
              placeholder="Ex : Konan Yao"
            />
          </Field>

          <Field label="Téléphone" required>
            <input
              type="tel"
              value={vPhone}
              onChange={(e) => setVPhone(e.target.value)}
              className="part-input"
              placeholder="+225XXXXXXXXXX"
            />
            {vPhone.length > 4 && !phoneValid && (
              <p className="mt-1 text-xs text-[#B45309]">
                Format attendu : +225 puis 01, 05 ou 07 et 8 chiffres (mobile)
              </p>
            )}
          </Field>

          <Field label="Commune" required>
            <select
              aria-label="Commune du vendeur"
              value={vCommune}
              onChange={(e) => setVCommune(e.target.value)}
              className="part-input"
            >
              <option value="">Choisir…</option>
              {ABIDJAN_COMMUNES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Adresse / repère" hint="Optionnel">
            <input
              value={vAddress}
              onChange={(e) => setVAddress(e.target.value)}
              className="part-input"
              placeholder="Ex : Rue des Jardins, près du marché"
            />
          </Field>
        </fieldset>
      )}

      <Field label="Nom de la pièce" required>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="part-input"
          placeholder="Ex : Alternateur 90A"
        />
      </Field>

      <Field label="Photos" hint={`JPEG, PNG ou WebP — 5 MB max, jusqu'à ${MAX_PHOTOS} photos`}>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, idx) => (
            <div key={p.urlOriginal} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.urlSmall ?? p.urlThumb ?? p.urlOriginal}
                alt={`Photo ${idx + 1} de la pièce`}
                className="aspect-square w-full rounded-md object-cover ring-1 ring-border"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                aria-label={`Retirer la photo ${idx + 1}`}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
              >
                ✕
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  Principale
                </span>
              )}
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label
              className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-card px-2 text-center text-sm ${
                imgUploading ? 'text-muted' : 'text-ink'
              }`}
            >
              {imgUploading ? 'Envoi…' : (
                <>
                  <span className="text-xl leading-none">+</span>
                  <span className="text-xs">
                    {photos.length === 0 ? 'Ajouter des photos' : 'Ajouter'}
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageSelect}
                disabled={imgUploading}
                className="sr-only"
              />
            </label>
          )}
        </div>
        {imgError && <p className="mt-1 text-xs text-[#D32F2F]">{imgError}</p>}
      </Field>

      <Field label="Catégorie">
        <select
          aria-label="Catégorie de la pièce"
          value={partCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="part-input"
        >
          <option value="">Choisir…</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      {partCategory && subcategoryOptions.length > 0 && (
        <Field label="Sous-catégorie" hint="Optionnel — précise la pièce">
          <select
            aria-label="Sous-catégorie de la pièce"
            value={partSubcategory}
            onChange={(e) => setPartSubcategory(e.target.value)}
            className="part-input"
          >
            <option value="">Toutes / non précisé</option>
            {subcategoryOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      )}

      <Field label="État" required>
        <div className="grid grid-cols-3 gap-2">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCondition(c.value)}
              className={`rounded-md px-3 py-2.5 text-sm transition-colors ${
                condition === c.value
                  ? 'bg-ink-2 text-white'
                  : 'bg-card text-ink ring-1 ring-border'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>

      {actor === 'vendor' && (
        <Field
          label="Origine"
          hint="OEM = pièce d'origine constructeur. Aftermarket = équipementier reconnu (Bosch, Valeo…). Compatible = générique."
        >
          <div className="grid grid-cols-3 gap-2">
            {PART_SOURCES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setPartSource((prev) => (prev === s.value ? '' : s.value))}
                className={`rounded-md px-3 py-2.5 text-sm transition-colors ${
                  partSource === s.value
                    ? 'bg-ink-2 text-white'
                    : 'bg-card text-ink ring-1 ring-border'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label="Prix (FCFA)" hint="Laissez vide si à confirmer">
        <input
          type="number"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="part-input"
          placeholder="Ex : 45000"
          min={0}
        />
      </Field>

      <Field
        label="Commission Pièces (FCFA)"
        hint={
          actor === 'vendor'
            ? 'Facultatif — montant reversé à Pièces sur la vente de cette pièce (0 accepté)'
            : 'Facultatif — laisser vide si le vendeur ne donne pas de commission'
        }
      >
        <input
          type="number"
          inputMode="numeric"
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
          className="part-input"
          placeholder="Ex : 3000"
          min={0}
        />
      </Field>

      <Field
        label="Référence OEM"
        hint="Photographiez l'étiquette ou le code-barres : référence et compatibilités sont remplies automatiquement"
      >
        <div className="flex gap-2">
          <input
            value={oemReference ?? ''}
            onChange={(e) => setOemReference(e.target.value)}
            className="part-input min-w-0 flex-1"
            placeholder="Ex : 27060-0L010"
          />
          <label
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-card px-3 text-sm ring-1 ring-border ${
              scanning ? 'text-muted' : 'text-ink'
            }`}
            style={{ minHeight: 44 }}
          >
            {scanning ? 'Analyse…' : '📷 Scanner'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleOemScan}
              disabled={scanning}
              className="sr-only"
            />
          </label>
        </div>
        {scanError && <p className="mt-1 text-xs text-[#D32F2F]">{scanError}</p>}
        {scanSummary && <p className="mt-1 text-xs text-[#1E6F4C]">{scanSummary}</p>}
      </Field>

      <Field label="Compatibilité véhicule (texte libre)" hint="Conservé pour la recherche plein-texte">
        <input
          value={vehicleCompatibility ?? ''}
          onChange={(e) => setVehicleCompatibility(e.target.value)}
          className="part-input"
          placeholder="Ex : Toyota Hilux 2010-2015"
        />
      </Field>

      <Field
        label="Compatibilités structurées"
        hint="Une ou plusieurs lignes marque + modèle + années + moteur (optionnels)"
      >
        {fitments.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {fitments.map((f, idx) => (
              <li
                key={`${f.brand}-${f.model ?? ''}-${f.yearFrom ?? ''}-${idx}`}
                className="flex items-center justify-between rounded-md bg-card px-3 py-2 text-sm ring-1 ring-border"
              >
                <span className="truncate text-ink">
                  <strong>{f.brand}</strong>
                  {f.model ? ` · ${f.model}` : ''}
                  {f.yearFrom || f.yearTo
                    ? ` · ${f.yearFrom ?? '…'}–${f.yearTo ?? '…'}`
                    : ''}
                  {f.engine ? ` · ${f.engine}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => removeFitment(idx)}
                  className="ml-2 text-xs text-[#D32F2F] hover:underline"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <select
            aria-label="Marque du véhicule compatible"
            value={fitBrand}
            onChange={(e) => handleFitBrandChange(e.target.value)}
            className="part-input"
          >
            <option value="">Marque *</option>
            {fitBrandNames.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select
            aria-label="Modèle du véhicule compatible"
            value={fitModel}
            onChange={(e) => handleFitModelChange(e.target.value)}
            className="part-input"
            disabled={!fitBrand}
          >
            <option value="">Modèle</option>
            {fitModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            aria-label="Année min"
            value={fitYearFrom}
            onChange={(e) => setFitYearFrom(e.target.value)}
            className="part-input"
            disabled={fitYears.length === 0}
          >
            <option value="">Année min</option>
            {fitYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            aria-label="Année max"
            value={fitYearTo}
            onChange={(e) => setFitYearTo(e.target.value)}
            className="part-input"
            disabled={fitYears.length === 0}
          >
            <option value="">Année max</option>
            {fitYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            aria-label="Moteur"
            value={fitEngine}
            onChange={(e) => setFitEngine(e.target.value)}
            className="part-input"
            disabled={fitEngines.length === 0}
          >
            <option value="">{fitEngines.length === 0 ? 'Moteur (choisir modèle)' : 'Moteur'}</option>
            {fitEngines.map((eng) => (
              <option key={eng} value={eng}>{eng}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={addFitment}
          disabled={fitBrand.trim().length < 1}
          className="mt-2 rounded-md bg-card px-3 py-2 text-sm text-ink ring-1 ring-border disabled:opacity-50"
        >
          + Ajouter une compatibilité
        </button>
      </Field>

      <Field label="Garantie">
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={warrantyValue}
            onChange={(e) => setWarrantyValue(e.target.value)}
            className="part-input min-w-0 flex-1"
            placeholder="Durée"
            min={0}
            max={365}
          />
          <select
            aria-label="Unité de garantie"
            value={warrantyUnit}
            onChange={(e) => setWarrantyUnit(e.target.value as WarrantyUnit)}
            className="part-input flex-1"
          >
            {WARRANTY_UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
      </Field>

      <Field
        label="Nombre d'articles disponibles"
        hint="Optionnel — le stock diminue à chaque commande ; à 0 la pièce passe en rupture."
      >
        <input
          type="number"
          inputMode="numeric"
          value={stockQuantity}
          onChange={(e) => setStockQuantity(e.target.value)}
          className="part-input"
          placeholder="Ex : 4 — vide si non suivi"
          min={0}
          max={99999}
        />
      </Field>

      {actor === 'vendor' && stockTracked && (
        <Field
          label="Seuil d'alerte stock"
          hint="Vous recevez une alerte WhatsApp quand la quantité atteint ce seuil."
        >
          <input
            type="number"
            inputMode="numeric"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            className="part-input"
            placeholder="Ex : 1"
            min={0}
            max={99999}
          />
        </Field>
      )}

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={stockTracked ? Number(stockQuantity) > 0 : inStock}
          onChange={(e) => setInStock(e.target.checked)}
          disabled={stockTracked}
          className="h-4 w-4"
        />
        <span className={`text-sm ${stockTracked ? 'text-muted' : 'text-ink'}`}>
          En stock
          {stockTracked && ' — géré automatiquement par la quantité'}
        </span>
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Link
          href={cancelHref}
          className="rounded-md bg-card px-4 py-2.5 text-sm font-medium text-muted ring-1 ring-border"
          style={{ minHeight: 44 }}
        >
          Annuler
        </Link>
        <button
          type="submit"
          disabled={!valid || submitting}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          {submitting
            ? mode === 'create' || publishAfterSave
              ? 'Publication…'
              : 'Enregistrement…'
            : mode === 'create'
            ? 'Publier la pièce'
            : publishAfterSave
              ? 'Enregistrer et publier'
              : 'Enregistrer'}
        </button>
      </div>

      <style jsx>{`
        :global(.part-input) {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          padding: 0.65rem 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--border, #e5e5e5);
          background: var(--card, #fff);
          color: var(--ink, #1a1a1a);
          /* 16px minimum : en dessous, iOS Safari zoome au focus et laisse la
             page scrollable horizontalement (le « scroll à droite » terrain). */
          font-size: 16px;
          min-height: 44px;
        }
        @media (min-width: 1024px) {
          :global(.part-input) {
            font-size: 14px;
          }
        }
        :global(.part-input:focus) {
          outline: 2px solid rgba(0, 35, 102, 0.4);
          outline-offset: 1px;
        }
      `}</style>
    </form>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink">
        {label}
        {required && <span className="text-accent">*</span>}
      </span>
      {hint && <span className="mb-1.5 block text-xs text-muted">{hint}</span>}
      {children}
    </label>
  )
}
