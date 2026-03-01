'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

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

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [uploads, setUploads] = useState<UploadedItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalSelected, setTotalSelected] = useState(0)

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  }, [])

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
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-2 text-xl font-bold text-[#1A1A1A]">Ajouter des pièces</h1>
      <p className="mb-6 text-sm text-gray-600">
        Photographiez vos pièces — l&apos;IA identifiera chaque pièce automatiquement.
      </p>

      {/* Upload area */}
      <label className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition-colors hover:border-[#1976D2] hover:bg-blue-50">
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
          capture="environment"
        />
      </label>

      {/* Progress counter */}
      {uploading && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-center">
          <p className="text-sm font-medium text-[#1976D2]">
            {uploads.length}/{totalSelected} pièces traitées
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-[#1976D2] transition-all"
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
            className="w-full rounded-lg bg-[#1976D2] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1565C0]"
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
