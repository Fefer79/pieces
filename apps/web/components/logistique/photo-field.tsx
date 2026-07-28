'use client'

import { useEffect, useRef, useState } from 'react'
import { compressImage } from '@/lib/logistique/compress-image'

export interface PickedPhoto {
  blob: Blob
  previewUrl: string
  name: string
}

/**
 * Champ photo : capture appareil sur mobile, compression immédiate (le HEIC iOS
 * est ré-encodé en JPEG, sinon le serveur le refuse), aperçu et retrait.
 *
 * La photo n'est PAS envoyée ici — elle part après la création du lead, pour
 * qu'un réseau capricieux ne fasse jamais perdre la demande elle-même.
 */
export function PhotoField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  value: PickedPhoto | null
  onChange: (photo: PickedPhoto | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  // Libère l'URL objet quand l'aperçu change ou disparaît.
  useEffect(() => {
    const url = value?.previewUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [value?.previewUrl])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    const blob = await compressImage(file)
    setBusy(false)
    onChange({ blob, previewUrl: URL.createObjectURL(blob), name: file.name })
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {hint && <p className="mb-2 text-[12.5px] leading-snug text-muted">{hint}</p>}

      {value ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.previewUrl}
            alt=""
            className="h-16 w-16 flex-shrink-0 rounded-sm object-cover"
          />
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{value.name}</span>
          <button
            type="button"
            onClick={() => {
              onChange(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="min-h-11 rounded-md border border-border-strong px-3 text-[13px] font-semibold text-ink hover:bg-surface"
          >
            Retirer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border-strong bg-card px-4 py-3 text-[14px] font-semibold text-ink-2 hover:bg-surface disabled:opacity-60"
        >
          {busy ? 'Préparation…' : 'Ajouter une photo'}
        </button>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
