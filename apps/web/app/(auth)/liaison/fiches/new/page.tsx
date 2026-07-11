'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { liaisonFetch } from '@/lib/liaison-api'
import { enrichmentUpload } from '@/lib/enrichment-api'
import type { Enrichment } from '@/lib/enrichment-api'

interface VendorOption {
  id: string
  shopName: string
  commune: string | null
}

const HINTS = ['Étiquette (référence lisible)', 'Pièce nue', 'Emballage / boîte', 'Détail (hologramme, gravure)']

export default function FicheExpressPage() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [vendeurId, setVendeurId] = useState('')
  const [fournisseur, setFournisseur] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    liaisonFetch<VendorOption[]>('/vendors').then((r) => {
      if (r.ok) setVendors(r.data)
    })
  }, [])

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  function addFiles(list: FileList | null) {
    if (!list) return
    setError(null)
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 4))
  }

  async function submit() {
    if (files.length < 2) {
      setError('Au moins 2 photos : l\'étiquette et la pièce elle-même.')
      return
    }
    setSubmitting(true)
    setError(null)

    const form = new FormData()
    files.forEach((f) => form.append('photos', f))
    if (vendeurId) form.append('vendeurId', vendeurId)
    if (fournisseur) form.append('fournisseurVisite', fournisseur)

    const result = await enrichmentUpload<Enrichment>(form)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.push(`/liaison/fiches/${result.data.id}`)
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <header className="mb-5">
        <h1 className="font-display text-2xl text-ink">Fiche express par photo</h1>
        <p className="mt-1 text-sm text-muted">
          Photographiez l&apos;étiquette, la pièce et l&apos;emballage : la fiche se remplit
          en quelques secondes, vous ajoutez le prix et le stock avec le vendeur.
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error-fg">{error}</p>
      )}

      <section className="rounded-md border border-border bg-card p-4">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          Photos ({files.length}/4)
        </span>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {previews.map((src, i) => (
            <figure key={src} className="relative overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={HINTS[i] ?? `Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink backdrop-blur transition-transform active:scale-[0.98]"
                aria-label="Retirer la photo"
              >
                ×
              </button>
              <figcaption className="bg-surface px-2 py-1 text-[11px] text-muted">
                {HINTS[i] ?? `Photo ${i + 1}`}
              </figcaption>
            </figure>
          ))}
          {files.length < 4 && (
            <label
              className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-strong text-sm text-muted transition-colors hover:bg-surface"
              style={{ minHeight: 44 }}
            >
              <span className="text-2xl leading-none text-muted-2">+</span>
              {HINTS[files.length]}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
          )}
        </div>
      </section>

      <section className="mt-4 grid gap-3 rounded-md border border-border bg-card p-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Vendeur (boutique visitée)</span>
          <select
            value={vendeurId}
            onChange={(e) => setVendeurId(e.target.value)}
            className="rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink"
          >
            <option value="">— À rattacher plus tard —</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.shopName}
                {v.commune ? ` · ${v.commune}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Fournisseur visité (optionnel)</span>
          <input
            value={fournisseur}
            onChange={(e) => setFournisseur(e.target.value)}
            placeholder="Ex. M'batto, Adjamé allée 3"
            className="rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink placeholder:text-muted-2"
          />
        </label>
      </section>

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || files.length < 2}
          className="rounded-md bg-accent px-4 py-3 text-sm font-medium text-white transition-transform hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
          style={{ minHeight: 48 }}
        >
          {submitting ? 'Analyse en cours…' : 'Analyser les photos'}
        </button>
        <Link
          href="/liaison/fiches"
          className="rounded-md bg-card px-4 py-3 text-center text-sm font-medium text-ink ring-1 ring-border transition-colors hover:bg-surface"
          style={{ minHeight: 48 }}
        >
          Mes fiches
        </Link>
      </div>
    </div>
  )
}
