'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { adminFetch, fmtFcfa } from '@/lib/admin-api'
import { Chip, ConditionChip, PartSourceChip } from '@/components/ui/chip'
import type { ChipVariant } from '@/components/ui/chip'

interface Photo {
  id: string
  position: number
  urlOriginal: string
  urlThumb: string | null
  urlSmall: string | null
  urlMedium: string | null
  urlLarge: string | null
}

interface Fitment {
  id: string
  brand: string
  model: string | null
  yearFrom: number | null
  yearTo: number | null
  engine: string | null
}

interface CatalogItem {
  id: string
  name: string | null
  category: string | null
  oemReference: string | null
  price: number | null
  platformMarkup: number
  suggestedPrice: number | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  condition: 'NEW' | 'USED' | 'REFURBISHED' | null
  partSource: 'OEM' | 'AFTERMARKET' | 'COMPATIBLE' | null
  inStock: boolean
  imageOriginalUrl: string | null
  imageThumbUrl: string | null
  externalSource: string | null
  externalSourceId: string | null
  externalSourceUrl: string | null
  aiGenerated: boolean
  qualityIssue: string | null
  priceAlertFlag: boolean
  createdAt: string
  updatedAt: string
  vendor: { id: string; shopName: string | null; isExternal: boolean; externalSource: string | null }
  photos: Photo[]
  fitments: Fitment[]
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  ARCHIVED: 'Archivé',
}
const STATUS_CHIP: Record<string, ChipVariant> = {
  DRAFT: 'status-warn',
  PUBLISHED: 'status-ok',
  ARCHIVED: 'plain',
}

const inputCls =
  'w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-ink focus:border-border-strong focus:outline-none'

interface FormState {
  name: string
  category: string
  oemReference: string
  price: string
  platformMarkup: string
  condition: '' | 'NEW' | 'USED' | 'REFURBISHED'
  partSource: '' | 'OEM' | 'AFTERMARKET' | 'COMPATIBLE'
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  inStock: boolean
}

function toForm(item: CatalogItem): FormState {
  return {
    name: item.name ?? '',
    category: item.category ?? '',
    oemReference: item.oemReference ?? '',
    price: item.price != null ? String(item.price) : '',
    platformMarkup: item.platformMarkup ? String(item.platformMarkup) : '',
    condition: item.condition ?? '',
    partSource: item.partSource ?? '',
    status: item.status,
    inStock: item.inStock,
  }
}

export default function AdminCatalogItemPage() {
  const params = useParams()
  const id = params.id as string
  const [item, setItem] = useState<CatalogItem | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const data = await adminFetch<CatalogItem>(`/admin/catalog/${id}`)
      setItem(data)
      setForm(toForm(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f))

  async function save() {
    if (!form) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim() || null,
        category: form.category.trim() || null,
        oemReference: form.oemReference.trim() || null,
        price: form.price.trim() === '' ? null : Number(form.price),
        platformMarkup: form.platformMarkup.trim() === '' ? 0 : Number(form.platformMarkup),
        condition: form.condition || null,
        partSource: form.partSource || null,
        status: form.status,
        inStock: form.inStock,
      }
      const updated = await adminFetch<CatalogItem>(`/admin/catalog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setItem(updated)
      setForm(toForm(updated))
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l’enregistrement')
    } finally {
      setSaving(false)
    }
  }

  async function uploadPhoto(file: File) {
    setPhotoBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await adminFetch(`/admin/catalog/${id}/photos`, { method: 'POST', body: fd })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de l’upload')
    } finally {
      setPhotoBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function deletePhoto(photoId: string) {
    if (!confirm('Supprimer cette photo ?')) return
    setPhotoBusy(true)
    setError(null)
    try {
      await adminFetch(`/admin/catalog/${id}/photos/${photoId}`, { method: 'DELETE' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la suppression')
    } finally {
      setPhotoBusy(false)
    }
  }

  async function movePhoto(index: number, dir: -1 | 1) {
    if (!item) return
    const ids = item.photos.map((p) => p.id)
    const target = index + dir
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
    setPhotoBusy(true)
    setError(null)
    try {
      await adminFetch(`/admin/catalog/${id}/photos/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: ids }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec du réordonnancement')
    } finally {
      setPhotoBusy(false)
    }
  }

  if (error && !item) return <div className="p-6 text-sm text-error-fg">{error}</div>
  if (!item || !form) return <div className="p-6 text-sm text-muted">Chargement…</div>

  // Display photos: explicit photo records, else the primary image (e.g. external imports).
  const galleryUrls =
    item.photos.length > 0
      ? item.photos.map((p) => ({ id: p.id, url: p.urlMedium ?? p.urlOriginal, removable: true }))
      : item.imageOriginalUrl
        ? [{ id: '__primary', url: item.imageOriginalUrl, removable: false }]
        : []

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 lg:py-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/catalog" className="text-sm text-ink-2 hover:underline">
            ← Annonces
          </Link>
          <h1 className="mt-1 font-display text-2xl text-ink">{item.name ?? 'Sans nom'}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Chip variant={STATUS_CHIP[item.status] ?? 'plain'}>
              {STATUS_LABELS[item.status] ?? item.status}
            </Chip>
            {item.condition && <ConditionChip condition={item.condition} />}
            {item.partSource && <PartSourceChip source={item.partSource} />}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {/* Provenance / attribution */}
      <div className="mb-5 rounded-md border border-border bg-card p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Vendeur</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-ink">{item.vendor.shopName ?? '—'}</span>
          {item.vendor.isExternal && <Chip variant="plain">Source externe</Chip>}
        </div>
        {item.externalSource && (
          <div className="mt-2 text-xs text-muted">
            Importé de <span className="font-mono">{item.externalSource}</span>
            {item.externalSourceUrl && (
              <>
                {' · '}
                <a
                  href={item.externalSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-2 hover:underline"
                >
                  voir sur le site source ↗
                </a>
              </>
            )}
          </div>
        )}
        {item.vendor.isExternal && (
          <p className="mt-2 text-xs text-muted-2">
            ⚠️ Les champs de cette annonce peuvent être écrasés lors d’un prochain import depuis la
            source.
          </p>
        )}
      </div>

      {/* Photos */}
      <section className="mb-5 rounded-md border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            Photos ({item.photos.length}/3)
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) uploadPhoto(f)
              }}
            />
            <button
              type="button"
              disabled={photoBusy || item.photos.length >= 3}
              onClick={() => fileRef.current?.click()}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-border-strong disabled:opacity-40"
            >
              {photoBusy ? 'Patientez…' : '+ Ajouter une photo'}
            </button>
          </div>
        </div>

        {galleryUrls.length === 0 ? (
          <p className="text-sm text-muted-2">Aucune photo.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {galleryUrls.map((g, idx) => (
              <div key={g.id} className="w-32">
                <div className="aspect-square overflow-hidden rounded-md border border-border bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.url ?? ''} alt="" className="h-full w-full object-cover" />
                </div>
                {g.removable && (
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={photoBusy || idx === 0}
                        onClick={() => movePhoto(idx, -1)}
                        className="rounded border border-border px-1.5 text-xs text-muted hover:text-ink disabled:opacity-30"
                        title="Déplacer à gauche"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={photoBusy || idx === item.photos.length - 1}
                        onClick={() => movePhoto(idx, 1)}
                        className="rounded border border-border px-1.5 text-xs text-muted hover:text-ink disabled:opacity-30"
                        title="Déplacer à droite"
                      >
                        →
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={() => deletePhoto(g.id)}
                      className="text-xs text-error-fg hover:underline disabled:opacity-40"
                    >
                      Suppr.
                    </button>
                  </div>
                )}
                {!g.removable && (
                  <div className="mt-1 text-center text-[10px] text-muted-2">image source</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edit form */}
      <section className="mb-5 rounded-md border border-border bg-card p-4">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          Modifier l’annonce
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nom">
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Catégorie">
            <input
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Référence OEM">
            <input
              value={form.oemReference}
              onChange={(e) => set('oemReference', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Prix (FCFA)">
            <input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              className={inputCls}
            />
            {item.suggestedPrice != null && (
              <span className="mt-1 block text-xs text-muted-2">
                Prix suggéré : {fmtFcfa(item.suggestedPrice)}
              </span>
            )}
          </Field>
          <Field label="Marge Pièces (FCFA)">
            <input
              type="number"
              min={0}
              value={form.platformMarkup}
              onChange={(e) => set('platformMarkup', e.target.value)}
              className={inputCls}
              placeholder="0"
            />
            <span className="mt-1 block text-xs text-muted-2">
              Ajoutée au prix vendeur, invisible côté vendeur. Acheteur paie{' '}
              {fmtFcfa((Number(form.price) || 0) + (Number(form.platformMarkup) || 0))}.
            </span>
          </Field>
          <Field label="Condition">
            <select
              value={form.condition}
              onChange={(e) => set('condition', e.target.value as FormState['condition'])}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="NEW">Neuf</option>
              <option value="USED">Occasion importée</option>
              <option value="REFURBISHED">Ré-usiné</option>
            </select>
          </Field>
          <Field label="Source de pièce">
            <select
              value={form.partSource}
              onChange={(e) => set('partSource', e.target.value as FormState['partSource'])}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="OEM">OEM</option>
              <option value="AFTERMARKET">Aftermarket</option>
              <option value="COMPATIBLE">Compatible</option>
            </select>
          </Field>
          <Field label="Statut">
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as FormState['status'])}
              className={inputCls}
            >
              <option value="DRAFT">Brouillon</option>
              <option value="PUBLISHED">Publié</option>
              <option value="ARCHIVED">Archivé</option>
            </select>
          </Field>
          <Field label="Stock">
            <label className="mt-1.5 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.inStock}
                onChange={(e) => set('inStock', e.target.checked)}
              />
              En stock
            </label>
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="rounded-full bg-ink-2 px-5 py-2 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {savedFlash && <span className="text-sm text-success-fg">✓ Enregistré</span>}
        </div>
      </section>

      {/* Fitments (read-only here) */}
      {item.fitments.length > 0 && (
        <section className="mb-5 rounded-md border border-border bg-card p-4">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            Compatibilités véhicule ({item.fitments.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {item.fitments.slice(0, 40).map((f) => (
              <span
                key={f.id}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted"
              >
                {f.brand}
                {f.model ? ` ${f.model}` : ''}
                {f.yearFrom ? ` (${f.yearFrom}${f.yearTo ? `–${f.yearTo}` : '+'})` : ''}
              </span>
            ))}
            {item.fitments.length > 40 && (
              <span className="text-xs text-muted-2">+{item.fitments.length - 40} autres…</span>
            )}
          </div>
        </section>
      )}

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid var(--border, #d4d4d4);
          background: var(--surface, #fff);
          padding: 0.5rem 0.625rem;
          font-size: 0.875rem;
          color: var(--ink, #111);
        }
      `}</style>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}
