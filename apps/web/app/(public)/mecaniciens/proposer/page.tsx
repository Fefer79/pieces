'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ABIDJAN_COMMUNES, MECHANIC_SPECIALTIES, type MechanicSpecialty } from 'shared/constants'
import { Button } from '@/components/ui/button'

// Leaflet touche `window` au chargement du module — cf. mecaniciens/inscription,
// même contrainte SSR.
const VendorMapPicker = dynamic(
  () => import('@/components/vendor-map-picker').then((m) => m.VendorMapPicker),
  { ssr: false },
)

// Nettoie une saisie téléphone au fil de la frappe (espaces, tirets,
// parenthèses) — l'API normalise aussi côté serveur, mais l'utilisateur voit
// tout de suite un numéro propre plutôt qu'un rejet à la soumission.
function sanitizePhoneInput(value: string) {
  return value.replace(/[^\d+]/g, '')
}

// API expérimentale (Chrome Android uniquement) : laisse l'utilisateur choisir
// un contact de son téléphone plutôt que de tout retaper. On ne peut pas
// aller chercher la photo de profil WhatsApp d'un numéro (aucune API publique
// ne l'expose) — seule la photo déjà enregistrée localement pour ce contact,
// si elle existe, est proposée ici.
interface ContactsManagerLike {
  select: (
    props: string[],
    opts?: { multiple?: boolean },
  ) => Promise<Array<{ name?: string[]; tel?: string[]; icon?: Blob[] }>>
}

function getContactsManager(): ContactsManagerLike | null {
  if (typeof navigator === 'undefined') return null
  const nav = navigator as Navigator & { contacts?: ContactsManagerLike }
  return nav.contacts ?? null
}

// Dépôt ouvert — aucune authentification requise, à la différence de
// l'inscription self-service (mecaniciens/inscription) qui publie une fiche
// pour son propre atelier. Ici on propose un tiers, modéré avant publication.
export default function ProposerMechanicPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [commune, setCommune] = useState('')
  const [address, setAddress] = useState('')
  const [specialty, setSpecialty] = useState<MechanicSpecialty | ''>('')
  const [note, setNote] = useState('')
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  })
  const [photo, setPhoto] = useState<{ file: File; previewUrl: string } | null>(null)
  const [contactsSupported, setContactsSupported] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    setContactsSupported(!!getContactsManager())
  }, [])

  const handleImportContact = async () => {
    const manager = getContactsManager()
    if (!manager) return
    setImportError(null)
    try {
      const [contact] = await manager.select(['name', 'tel', 'icon'], { multiple: false })
      if (!contact) return
      if (contact.name?.[0]) setName(contact.name[0])
      if (contact.tel?.[0]) setPhone(sanitizePhoneInput(contact.tel[0]))
      if (contact.icon?.[0]) {
        const file = new File([contact.icon[0]], 'contact-photo.jpg', {
          type: contact.icon[0].type || 'image/jpeg',
        })
        setPhoto({ file, previewUrl: URL.createObjectURL(file) })
      }
    } catch (e) {
      // AbortError = l'utilisateur a fermé le sélecteur — pas une vraie erreur.
      if (e instanceof Error && e.name !== 'AbortError') {
        setImportError("Impossible d'accéder à vos contacts.")
      }
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setPhoto({ file, previewUrl: URL.createObjectURL(file) })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !phone.trim()) {
      setError('Le nom et le téléphone sont obligatoires')
      return
    }

    setSubmitting(true)
    try {
      let photoUrl: string | undefined
      if (photo) {
        setUploadingPhoto(true)
        try {
          const form = new FormData()
          form.append('file', photo.file)
          const uploadRes = await fetch('/api/v1/mechanics/suggestions/photo-upload', {
            method: 'POST',
            body: form,
          })
          const uploadBody = await uploadRes.json().catch(() => ({}))
          if (!uploadRes.ok) {
            setError(uploadBody?.error?.message ?? "Échec de l'envoi de la photo")
            return
          }
          photoUrl = uploadBody.data.url
        } finally {
          setUploadingPhoto(false)
        }
      }

      const res = await fetch('/api/v1/mechanics/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: sanitizePhoneInput(phone),
          commune: commune || undefined,
          address: address.trim() || undefined,
          lat: coords.lat ?? undefined,
          lng: coords.lng ?? undefined,
          specialty: specialty || undefined,
          note: note.trim() || undefined,
          photo: photoUrl,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.error?.message ?? 'Erreur lors de l’envoi')
        return
      }
      setDone(true)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center lg:px-8">
        <h1 className="font-display text-3xl text-ink">Merci !</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
          Votre proposition a bien été reçue. L&apos;équipe Pièces la vérifie avant de publier la
          fiche dans l&apos;annuaire.
        </p>
        <Link
          href="/mecaniciens"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Voir l&apos;annuaire
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 lg:px-8">
      <h1 className="mb-2 font-display text-3xl text-ink">Proposer un mécanicien</h1>
      <p className="mb-8 text-[14.5px] text-muted">
        Vous connaissez un atelier fiable qui n&apos;est pas encore dans l&apos;annuaire ?
        Proposez-le — aucun compte n&apos;est nécessaire. L&apos;équipe Pièces vérifie
        l&apos;information avant publication.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {contactsSupported && (
          <div className="rounded-md border border-dashed border-border-strong bg-surface p-3">
            <button
              type="button"
              onClick={handleImportContact}
              className="text-sm font-semibold text-accent hover:underline"
            >
              📇 Importer depuis mes contacts
            </button>
            <p className="mt-1 text-xs text-muted">
              Remplit le nom et le téléphone automatiquement — et la photo si votre téléphone
              en a une enregistrée pour ce contact.
            </p>
            {importError && <p className="mt-1 text-xs text-error-fg">{importError}</p>}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Nom de l&apos;atelier ou du mécanicien</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Garage Koffi Auto"
            className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Téléphone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
            placeholder="+225…"
            className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Photo (optionnel)</label>
          <div className="flex items-center gap-3">
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.previewUrl}
                alt=""
                className="h-16 w-16 rounded-md border border-border object-cover"
              />
            )}
            <label className="cursor-pointer rounded-md border border-border-strong bg-card px-3 py-2 text-xs font-medium text-ink hover:border-ink-2">
              {photo ? 'Changer la photo' : 'Ajouter une photo'}
              <input type="file" accept="image/*" hidden onChange={handlePhotoSelect} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Commune</label>
            <select
              value={commune}
              onChange={(e) => setCommune(e.target.value)}
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none"
            >
              <option value="">—</option>
              {ABIDJAN_COMMUNES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Adresse (optionnel)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rue, quartier…"
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Localiser sur la carte (optionnel)
          </label>
          <p className="mb-2 text-xs text-muted">
            Aide les autres à trouver l&apos;atelier précisément une fois publié.
          </p>
          <VendorMapPicker
            lat={coords.lat}
            lng={coords.lng}
            onChange={(c) => setCoords(c)}
            height={260}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Spécialité (optionnel)</label>
          <div className="flex flex-wrap gap-2">
            {MECHANIC_SPECIALTIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpecialty((prev) => (prev === s ? '' : s))}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  specialty === s
                    ? 'bg-ink-2 text-white'
                    : 'border border-border bg-card text-muted hover:border-border-strong hover:text-ink'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Pourquoi le recommander ? (optionnel)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Ce qui le rend fiable, ce qu'il fait bien…"
            className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
          />
        </div>

        <Button type="submit" variant="accent" size="lg" block disabled={submitting || uploadingPhoto}>
          {uploadingPhoto ? 'Envoi de la photo…' : submitting ? 'Envoi…' : 'Envoyer la proposition'}
        </Button>
      </form>
    </main>
  )
}
