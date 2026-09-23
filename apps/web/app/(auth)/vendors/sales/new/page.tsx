'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { catalogFetch } from '@/lib/catalog-api'
import { Button } from '@/components/ui/button'
import { PredictiveSearch, type PredictiveItem } from '@/components/predictive-search'

interface MyCatalogItem {
  id: string
  name: string | null
  price: number | null
}

const CHANNELS: Array<{ value: string; label: string }> = [
  { value: 'BOUTIQUE', label: 'En boutique' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'TELEPHONE', label: 'Téléphone' },
  { value: 'AUTRE', label: 'Autre' },
]

export default function NewVendorSalePage() {
  const router = useRouter()
  const [catalogItems, setCatalogItems] = useState<MyCatalogItem[]>([])

  const [itemName, setItemName] = useState('')
  const [catalogItemId, setCatalogItemId] = useState<string | undefined>(undefined)
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [channel, setChannel] = useState('BOUTIQUE')
  const [note, setNote] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    catalogFetch<{ items: MyCatalogItem[] }>('/items?status=PUBLISHED&limit=100').then((r) => {
      if (r.ok) setCatalogItems(r.data.items)
    })
  }, [])

  const byName = useMemo(() => {
    const m = new Map<string, MyCatalogItem>()
    for (const it of catalogItems) if (it.name) m.set(it.name, it)
    return m
  }, [catalogItems])

  const fetchSuggestions = useCallback(
    async (term: string): Promise<PredictiveItem[]> => {
      const t = term.toLowerCase()
      return catalogItems
        .filter((it) => it.name?.toLowerCase().includes(t))
        .slice(0, 8)
        .map((it) => ({ label: it.name as string }))
    },
    [catalogItems],
  )

  const handleItemNameChange = (value: string) => {
    setItemName(value)
    const match = byName.get(value)
    if (match) {
      setCatalogItemId(match.id)
      if (match.price != null && !unitPrice) setUnitPrice(String(match.price))
    } else {
      setCatalogItemId(undefined)
    }
  }

  const totalAmount =
    Number(quantity || '0') > 0 && Number(unitPrice || '0') > 0
      ? Number(quantity) * Number(unitPrice)
      : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!itemName.trim()) {
      setError("Indiquez le nom de l'article vendu")
      return
    }
    const price = Number(unitPrice)
    if (!Number.isFinite(price) || price <= 0) {
      setError('Indiquez un prix unitaire valide')
      return
    }

    setSubmitting(true)
    try {
      const r = await catalogFetch('/sales', {
        method: 'POST',
        body: JSON.stringify({
          catalogItemId,
          itemName: itemName.trim(),
          quantity: Number(quantity || '1'),
          unitPrice: price,
          buyerName: buyerName.trim() || undefined,
          buyerPhone: buyerPhone.trim() || undefined,
          channel,
          note: note.trim() || undefined,
        }),
      })

      if (!r.ok) {
        setError(r.message)
        return
      }
      router.push('/vendors/sales')
    } catch {
      // La connexion a coupé pendant l'envoi : le service worker a mis la
      // requête en attente et la rejouera à la reconnexion (voir app/sw.ts).
      if (!navigator.onLine) {
        router.push('/vendors/sales?queued=1')
        return
      }
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <Link href="/vendors/sales" className="text-sm font-semibold text-accent hover:underline">
        ← Mes ventes
      </Link>

      <h1 className="mb-6 mt-3 font-display text-3xl text-ink">Nouvelle vente</h1>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Article vendu</label>
          <PredictiveSearch
            value={itemName}
            onChange={handleItemNameChange}
            fetchSuggestions={fetchSuggestions}
            placeholder="Nom de la pièce (de votre catalogue ou libre)"
            inputClassName="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
          />
          {catalogItemId && (
            <p className="mt-1 text-xs text-muted">Article lié à votre catalogue — le stock sera décrémenté.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Quantité</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Prix unitaire (FCFA)</label>
            <input
              type="number"
              min={0}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0"
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
            />
          </div>
        </div>

        {totalAmount > 0 && (
          <p className="text-sm text-muted">
            Total : <span className="font-semibold text-ink">{totalAmount.toLocaleString('fr-FR')} FCFA</span>
          </p>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Canal de vente</label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setChannel(c.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  channel === c.value
                    ? 'bg-ink-2 text-white'
                    : 'border border-border bg-card text-muted hover:border-border-strong hover:text-ink'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Client (optionnel)</label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Nom"
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Téléphone (optionnel)</label>
            <input
              type="tel"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              placeholder="+225…"
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Note (optionnel)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
          />
        </div>

        <Button type="submit" variant="accent" size="lg" block disabled={submitting}>
          {submitting ? 'Enregistrement…' : 'Enregistrer la vente'}
        </Button>
      </form>
    </div>
  )
}
