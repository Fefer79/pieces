'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Chip } from '@/components/ui/chip'

interface MyQuote {
  id: string
  reference: string
  status: string
  partName: string
  vehicleBrand: string | null
  vehicleModel: string | null
  certaintyLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  QUOTING: 'En cotation',
  QUOTED: 'Devis envoyé',
  WON: 'Accepté',
  LOST: 'Refusé',
}
const STATUS_CHIP: Record<string, 'oem' | 'status-warn' | 'status-ok' | 'plain'> = {
  NEW: 'oem',
  CONTACTED: 'oem',
  QUOTING: 'status-warn',
  QUOTED: 'status-ok',
  WON: 'status-ok',
  LOST: 'plain',
}
const CERTAINTY_CHIP: Record<string, 'status-warn' | 'oem' | 'status-ok'> = {
  LOW: 'status-warn',
  MEDIUM: 'oem',
  HIGH: 'status-ok',
}

export default function ProfileCotationsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<MyQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login?next=/profile/cotations')
      return
    }
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setError('Session expirée.')
        setLoading(false)
        return
      }
      const res = await fetch('/api/v1/logistics/quote-requests/mine', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (cancelled) return
      setLoading(false)
      if (!res.ok) {
        setError('Impossible de charger vos cotations.')
        return
      }
      const body = await res.json()
      setItems(body.data as MyQuote[])
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, router])

  if (authLoading) {
    return <div className="p-6 text-sm text-muted">Chargement…</div>
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <Link href="/profile" className="text-[13px] text-ink-2 hover:underline">
          ← Mon profil
        </Link>
        <h1 className="mt-2 font-display text-3xl text-ink">Mes cotations logistique</h1>
        <p className="mt-1 text-sm text-muted">
          Demandes d&apos;import de pièces que vous avez soumises. Le détail d&apos;une cotation
          est accessible par sa référence, partout dans l&apos;app.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Référence</Th>
              <Th>Pièce</Th>
              <Th>Véhicule</Th>
              <Th>Statut</Th>
              <Th align="right">Date</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading && (
              <Tr>
                <Td colSpan={5} align="center" className="py-8 text-muted">Chargement…</Td>
              </Tr>
            )}
            {!loading && items.length === 0 && (
              <Tr>
                <Td colSpan={5} align="center" className="py-8 text-muted">
                  Aucune cotation pour le moment.{' '}
                  <Link href="/logistique/devis" className="text-ink-2 hover:underline">
                    Démarrer une demande →
                  </Link>
                </Td>
              </Tr>
            )}
            {items.map((q) => (
              <Tr key={q.id}>
                <Td>
                  <Link
                    href={`/logistique/suivi/${q.reference}`}
                    className="font-mono text-[12.5px] font-semibold text-ink-2 hover:underline"
                  >
                    {q.reference}
                  </Link>
                </Td>
                <Td className="text-ink">{q.partName}</Td>
                <Td className="text-muted">
                  {[q.vehicleBrand, q.vehicleModel].filter(Boolean).join(' ') || '—'}
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip variant={STATUS_CHIP[q.status] ?? 'plain'}>
                      {STATUS_LABEL[q.status] ?? q.status}
                    </Chip>
                    <Chip variant={CERTAINTY_CHIP[q.certaintyLevel]}>{q.certaintyLevel}</Chip>
                  </div>
                </Td>
                <Td num className="text-muted">
                  {new Date(q.createdAt).toLocaleDateString('fr-FR')}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      <div className="mt-6">
        <Link
          href="/logistique/devis"
          className="inline-block rounded-md bg-accent px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Nouvelle cotation
        </Link>
      </div>
    </div>
  )
}
