'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { contactsFetch } from '@/lib/contacts-api'

const STATUT_LABELS: Record<string, string> = {
  A_CONTACTER: 'A contacter',
  APPELE: 'Appelé',
  VISITE: 'Visité',
  RELANCE: 'A relancer',
  CONCLU: 'Conclu',
  INJOIGNABLE: 'Injoignable',
  A_REVOIR: 'A revoir',
  REJETE: 'Rejeté',
}

const STATUT_CLASSES: Record<string, string> = {
  A_CONTACTER: 'bg-amber-50 text-amber-800 border-amber-200',
  APPELE: 'bg-blue-50 text-blue-800 border-blue-200',
  VISITE: 'bg-violet-50 text-violet-800 border-violet-200',
  RELANCE: 'bg-orange-50 text-orange-800 border-orange-200',
  CONCLU: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  INJOIGNABLE: 'bg-red-50 text-red-800 border-red-200',
  A_REVOIR: 'bg-sky-50 text-sky-800 border-sky-200',
  REJETE: 'bg-gray-100 text-gray-500 border-gray-200',
}

const ACTIVITY_LABELS: Record<string, string> = {
  APPEL: 'Appel',
  WHATSAPP: 'WhatsApp',
  VISITE: 'Visite',
  NOTE: 'Note',
  STATUT: 'Statut',
  ASSIGNATION: 'Assignation',
  CONVERSION: 'Conversion',
}

interface Activity {
  id: string
  type: string
  note: string | null
  statutAvant: string | null
  statutApres: string | null
  createdAt: string
  author: { id: string; name: string | null; phone: string | null } | null
}

interface Lien {
  id: string
  url: string
  type: string
  label: string | null
  scrapedAt: string | null
}

interface Contact {
  id: string
  name: string
  shopName: string | null
  phone: string
  phone2: string | null
  whatsapp: string | null
  email: string | null
  commune: string | null
  address: string | null
  lat: number | null
  lng: number | null
  pieces: string[]
  piecesLibre: string | null
  remarques: string | null
  statut: string
  relanceLe: string | null
  derniereVisite: string | null
  derniereCommande: string | null
  notesAppel: string | null
  photos: string[]
  vendorId: string | null
  source: string
  createdAt: string
  updatedAt: string
  liens: Lien[]
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [linkInput, setLinkInput] = useState({ url: '', type: 'FACEBOOK', label: '' })
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityForm, setActivityForm] = useState({ type: 'APPEL', note: '', statut: '', relanceLe: '' })
  const [savingActivity, setSavingActivity] = useState(false)
  const [converting, setConverting] = useState(false)

  async function loadActivities() {
    const r = await contactsFetch<Activity[]>(`/${id}/activities`)
    if (r.ok) setActivities(r.data)
  }

  async function updateStatut(statut: string) {
    setUpdating(true)
    const r = await contactsFetch<{ activity: Activity; contact: Contact }>(`/${id}/activities`, {
      method: 'POST',
      body: JSON.stringify({ type: 'STATUT', statut }),
    })
    if (r.ok) {
      setContact(r.data.contact)
      setActivities((prev) => [r.data.activity, ...prev])
    } else setError(r.message)
    setUpdating(false)
  }

  async function logActivity() {
    setSavingActivity(true)
    const payload: Record<string, unknown> = { type: activityForm.type }
    if (activityForm.note.trim()) payload.note = activityForm.note.trim()
    if (activityForm.statut) payload.statut = activityForm.statut
    if (activityForm.relanceLe) payload.relanceLe = new Date(activityForm.relanceLe).toISOString()

    const r = await contactsFetch<{ activity: Activity; contact: Contact }>(`/${id}/activities`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (r.ok) {
      setContact(r.data.contact)
      setActivities((prev) => [r.data.activity, ...prev])
      setActivityForm({ type: 'APPEL', note: '', statut: '', relanceLe: '' })
    } else setError(r.message)
    setSavingActivity(false)
  }

  async function convertToVendor() {
    if (!confirm('Convertir ce contact en vendeur ? Un compte vendeur sera créé avec ces coordonnées.')) return
    setConverting(true)
    const r = await contactsFetch<Contact>(`/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify({ vendorType: 'INFORMAL' }),
    })
    if (r.ok) {
      setContact(r.data)
      loadActivities()
    } else setError(r.message)
    setConverting(false)
  }

  async function deleteContact() {
    if (!confirm('Supprimer ce contact ?')) return
    const r = await contactsFetch(`/${id}`, { method: 'DELETE' })
    if (r.ok) router.push('/liaison/contacts')
    else setError(r.message)
  }

  async function loadContact() {
    const r = await contactsFetch<Contact>(`/${id}`)
    if (r.ok) setContact(r.data)
    else setError(r.message)
    setLoading(false)
  }

  useEffect(() => {
    loadContact()
    loadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function addLink() {
    if (!linkInput.url) return
    const r = await contactsFetch(`/${id}/links`, {
      method: 'POST',
      body: JSON.stringify(linkInput),
    })
    if (r.ok) {
      setLinkInput({ url: '', type: 'FACEBOOK', label: '' })
      loadContact()
    } else {
      setError(r.message)
    }
  }

  async function deleteLink(lienId: string) {
    const r = await contactsFetch(`/${id}/links/${lienId}`, { method: 'DELETE' })
    if (r.ok) loadContact()
    else setError(r.message)
  }

  if (loading) return <p className="p-6 text-sm text-muted">Chargement…</p>

  if (error && !contact) {
    return <p className="mx-auto max-w-lg px-4 py-6 text-sm text-[#D32F2F]">{error}</p>
  }

  if (!contact) return null

  const displayPhone = contact.whatsapp || contact.phone
  const waMessage = `Bonjour${contact.name ? ` ${contact.name}` : ''}, je vous contacte de la part de Pièces (pieces.ci), la plateforme de vente de pièces auto à Abidjan. Nous aidons les vendeurs comme vous à toucher plus de clients. Puis-je vous en dire plus ?`
  const waLink = displayPhone
    ? `https://wa.me/${displayPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}`
    : null

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/liaison/contacts" className="text-muted hover:text-ink" style={{ minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center' }}>
          ← Retour
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-border bg-card p-3 text-sm text-[#D32F2F]">{error}</p>
      )}

      <div className="rounded-md border border-border bg-card p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl text-ink">{contact.name}</h1>
            {contact.shopName && <p className="text-sm text-muted">{contact.shopName}</p>}
            {contact.source && contact.source !== 'MANUEL' && (
              <span className="mt-1 inline-block rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                Lead {contact.source === 'OSM' ? 'OSM' : contact.source.replace(/_CI$/i, '').replace(/_/g, ' ').toLowerCase()}
              </span>
            )}
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUT_CLASSES[contact.statut] ?? ''}`}>
            {STATUT_LABELS[contact.statut] ?? contact.statut}
          </span>
        </div>

        <div className="space-y-3 text-sm">
          {contact.commune && (
            <div className="flex items-center gap-2">
              <span className="text-muted">Commune :</span>
              <span className="font-medium text-ink">{contact.commune}</span>
            </div>
          )}
          {contact.address && (
            <div className="flex items-center gap-2">
              <span className="text-muted">Adresse :</span>
              <span className="font-medium text-ink">{contact.address}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-muted">Tél :</span>
            <a href={`tel:${contact.phone}`} className="font-mono font-medium text-accent">{contact.phone}</a>
            {contact.phone2 && <a href={`tel:${contact.phone2}`} className="font-mono text-muted">{contact.phone2}</a>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366] px-3 py-2 text-xs font-medium text-white"
              style={{ minHeight: 44 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          )}
          <a
            href={`tel:${contact.phone}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-ink hover:bg-ink/[0.02]"
            style={{ minHeight: 44 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
            Appeler
          </a>
        </div>

        {contact.pieces.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="mb-2 text-xs font-semibold text-muted uppercase tracking-wider">Pièces</h3>
            <div className="flex flex-wrap gap-1.5">
              {contact.pieces.map((p, i) => (
                <span key={i} className="rounded border border-border px-2 py-1 font-mono text-[11px] text-ink">{p}</span>
              ))}
            </div>
            {contact.piecesLibre && (
              <p className="mt-1 text-xs text-muted">{contact.piecesLibre}</p>
            )}
          </div>
        )}

        {contact.remarques && (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="mb-1 text-xs font-semibold text-muted uppercase tracking-wider">Remarques</h3>
            <p className="text-sm text-ink whitespace-pre-wrap">{contact.remarques}</p>
          </div>
        )}

        {contact.notesAppel && (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="mb-1 text-xs font-semibold text-muted uppercase tracking-wider">Notes d&apos;appel</h3>
            <p className="text-sm text-ink whitespace-pre-wrap">{contact.notesAppel}</p>
          </div>
        )}

        {contact.relanceLe && (
          <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Prochaine relance : {new Date(contact.relanceLe).toLocaleDateString('fr-FR')}
          </div>
        )}

        <div className="mt-4 border-t border-border pt-4">
          {contact.vendorId ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              ✓ Lié à un compte vendeur
            </p>
          ) : (
            <button
              onClick={convertToVendor}
              disabled={converting}
              className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ minHeight: 44 }}
            >
              {converting ? 'Conversion…' : 'Convertir en vendeur'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-lg text-ink">Suivi</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUT_LABELS).map(([k, v]) => (
            <button
              key={k}
              disabled={updating || contact.statut === k}
              onClick={() => updateStatut(k)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                contact.statut === k
                  ? STATUT_CLASSES[k]
                  : 'border-border bg-card text-muted hover:border-ink hover:text-ink'
              } disabled:opacity-50`}
              style={{ minHeight: 44 }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-lg text-ink">Journal d&apos;actions</h2>

        <div className="space-y-2 rounded-md border border-border bg-ink/[0.02] p-3">
          <div className="flex gap-2">
            <select
              value={activityForm.type}
              onChange={(e) => setActivityForm((p) => ({ ...p, type: e.target.value }))}
              className="rounded-md border border-border bg-card px-2 py-2 text-xs text-ink"
              style={{ minHeight: 44 }}
            >
              <option value="APPEL">Appel</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="VISITE">Visite</option>
              <option value="NOTE">Note</option>
            </select>
            <select
              value={activityForm.statut}
              onChange={(e) => setActivityForm((p) => ({ ...p, statut: e.target.value }))}
              className="flex-1 rounded-md border border-border bg-card px-2 py-2 text-xs text-ink"
              style={{ minHeight: 44 }}
            >
              <option value="">Statut inchangé</option>
              {Object.entries(STATUT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>→ {v}</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Compte-rendu (optionnel) : ce qui a été dit, à faire ensuite…"
            value={activityForm.note}
            onChange={(e) => setActivityForm((p) => ({ ...p, note: e.target.value }))}
            rows={2}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-ink placeholder-muted"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">Relance :</label>
            <input
              type="date"
              value={activityForm.relanceLe}
              onChange={(e) => setActivityForm((p) => ({ ...p, relanceLe: e.target.value }))}
              className="rounded-md border border-border bg-card px-2 py-1.5 text-xs text-ink"
              style={{ minHeight: 44 }}
            />
            <button
              onClick={logActivity}
              disabled={savingActivity}
              className="ml-auto rounded-md bg-accent px-4 py-2.5 text-xs font-medium text-white disabled:opacity-50"
              style={{ minHeight: 44 }}
            >
              {savingActivity ? 'Enregistrement…' : 'Enregistrer l’action'}
            </button>
          </div>
        </div>

        {activities.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucune action enregistrée pour l&apos;instant.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {activities.map((a) => (
              <li key={a.id} className="border-l-2 border-border pl-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-border px-2 py-0.5 font-medium text-ink">
                    {ACTIVITY_LABELS[a.type] ?? a.type}
                  </span>
                  {a.statutApres && (
                    <span className={`rounded-full border px-2 py-0.5 ${STATUT_CLASSES[a.statutApres] ?? ''}`}>
                      {STATUT_LABELS[a.statutApres] ?? a.statutApres}
                    </span>
                  )}
                  <span className="text-muted">
                    {new Date(a.createdAt).toLocaleDateString('fr-FR')}{' '}
                    {new Date(a.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {a.author?.name && <span className="text-muted">· {a.author.name}</span>}
                </div>
                {a.note && <p className="mt-1 text-sm text-ink whitespace-pre-wrap">{a.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-lg text-ink">Liens</h2>
        {contact.liens.length === 0 ? (
          <p className="text-sm text-muted">Aucun lien enregistré</p>
        ) : (
          <ul className="space-y-2">
            {contact.liens.map((l) => (
              <li key={l.id} className="flex items-center gap-2">
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-accent underline"
                >
                  {l.label || l.url}
                </a>
                <span className="text-[10px] text-muted">{l.type}</span>
                <button
                  onClick={() => deleteLink(l.id)}
                  className="text-[10px] text-red-500 hover:text-red-700"
                  style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="flex gap-2">
            <input
              placeholder="URL (Facebook, WhatsApp...)"
              value={linkInput.url}
              onChange={(e) => setLinkInput((p) => ({ ...p, url: e.target.value }))}
              className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-xs text-ink placeholder-muted"
              style={{ minHeight: 44 }}
            />
            <select
              value={linkInput.type}
              onChange={(e) => setLinkInput((p) => ({ ...p, type: e.target.value }))}
              className="w-28 rounded-md border border-border bg-card px-2 py-2 text-xs text-ink"
              style={{ minHeight: 44 }}
            >
              <option value="FACEBOOK">Facebook</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="TIKTOK">TikTok</option>
              <option value="SITE_WEB">Site web</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
          <input
            placeholder="Libellé (optionnel)"
            value={linkInput.label}
            onChange={(e) => setLinkInput((p) => ({ ...p, label: e.target.value }))}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-ink placeholder-muted"
            style={{ minHeight: 44 }}
          />
          <button
            onClick={addLink}
            disabled={!linkInput.url}
            className="rounded-md bg-accent px-4 py-2.5 text-xs font-medium text-white disabled:opacity-50"
            style={{ minHeight: 44 }}
          >
            Ajouter le lien
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <button
          onClick={deleteContact}
          className="rounded-md border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          style={{ minHeight: 44 }}
        >
          Supprimer ce contact
        </button>
      </div>
    </div>
  )
}
