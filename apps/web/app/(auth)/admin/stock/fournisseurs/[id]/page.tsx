'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { stockFetch, fmtFcfa, type SupplierDetail, type PurchaseOrderStatus } from '@/lib/stock-api'
import { formatShortDate, PO_STATUS_LABELS, poModeLabel, poStatusVariant } from '@/lib/stock-utils'
import { StatCard } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { SupplierFormCard } from '@/components/stock/supplier-form-card'

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>()
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    stockFetch<SupplierDetail>(`/suppliers/${params.id}`).then((res) => {
      if (res.ok) {
        setSupplier(res.data)
        setError(null)
      } else {
        setNotFound(true)
        setError(res.message)
      }
    })
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  async function toggleActif() {
    if (!supplier || busy) return
    setBusy(true)
    setError(null)
    const res = await stockFetch(`/suppliers/${supplier.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ actif: !supplier.actif }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    load()
  }

  if (notFound) {
    return (
      <div>
        <Link href="/admin/stock/fournisseurs" className="text-[13px] text-ink-2 hover:underline">
          ← Fournisseurs
        </Link>
        <p className="mt-4 text-sm text-error-fg">{error ?? 'Fournisseur introuvable.'}</p>
      </div>
    )
  }
  if (!supplier) return <div className="text-sm text-muted">Chargement…</div>

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/stock/fournisseurs" className="text-[13px] text-ink-2 hover:underline">
          ← Fournisseurs
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl text-ink">{supplier.nom}</h1>
          <Chip variant={supplier.actif ? 'status-ok' : 'plain'}>
            {supplier.actif ? 'Actif' : 'Inactif'}
          </Chip>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setShowEdit((v) => !v)}
              className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card"
            >
              {showEdit ? 'Fermer' : 'Modifier'}
            </button>
            <button
              onClick={toggleActif}
              disabled={busy}
              className={`rounded-sm border px-3 py-1.5 text-sm disabled:opacity-40 ${
                supplier.actif
                  ? 'border-error-fg/30 text-error-fg hover:bg-error-bg'
                  : 'border-border-strong hover:bg-card'
              }`}
            >
              {supplier.actif ? 'Désactiver' : 'Réactiver'}
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted">
          {[supplier.ville, supplier.pays].filter(Boolean).join(', ') ||
            'Localisation non renseignée'}
          {` · ${supplier.devise}`}
          {supplier.delaiTypiqueJours != null
            ? ` · délai typique ~${supplier.delaiTypiqueJours} j`
            : ''}
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {showEdit && (
        <SupplierFormCard
          title="Modifier le fournisseur"
          supplierId={supplier.id}
          initial={supplier}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            load()
          }}
        />
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Volume cumulé (hors annulés)" value={fmtFcfa(supplier.volumeFcfa)} />
        <StatCard label="Bons récents" value={supplier.bonsCommande.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Coordonnées
            </h2>
          </div>
          <div className="p-5">
            <dl className="space-y-1.5 text-[13px]">
              <Row label="Contact" value={supplier.contactName ?? '—'} />
              <Row label="Téléphone" value={supplier.telephone ?? '—'} mono />
              <Row label="WhatsApp" value={supplier.whatsapp ?? '—'} mono />
              <Row label="Email" value={supplier.email ?? '—'} />
              <Row label="Site" value={supplier.site ?? '—'} />
              <Row label="Devise" value={supplier.devise} mono />
              <Row
                label="Délai typique"
                value={supplier.delaiTypiqueJours != null ? `${supplier.delaiTypiqueJours} j` : '—'}
              />
              {supplier.conditions && <Row label="Conditions" value={supplier.conditions} />}
              {supplier.notes && <Row label="Notes" value={supplier.notes} />}
            </dl>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Derniers bons de commande ({supplier.bonsCommande.length})
            </h2>
          </div>
          <div className="p-5">
            {supplier.bonsCommande.length === 0 ? (
              <p className="text-sm text-muted">Aucun bon de commande pour ce fournisseur.</p>
            ) : (
              <Table>
                <Thead>
                  <Tr hover={false}>
                    <Th>Numéro</Th>
                    <Th>Statut</Th>
                    <Th>Mode</Th>
                    <Th align="right">Montant estimé</Th>
                    <Th>Créé le</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {supplier.bonsCommande.map((po) => (
                    <Tr key={po.id}>
                      <Td>
                        <Link
                          href={`/admin/stock/achats/${po.id}`}
                          className="font-mono font-medium text-ink hover:text-accent hover:underline"
                        >
                          {po.numero}
                        </Link>
                      </Td>
                      <Td>
                        <Chip variant={poStatusVariant(po.statut)}>
                          {PO_STATUS_LABELS[po.statut as PurchaseOrderStatus] ?? po.statut}
                        </Chip>
                      </Td>
                      <Td className="text-sm">{poModeLabel(po.mode)}</Td>
                      <Td num>
                        {po.montantEstimeFcfa != null ? fmtFcfa(po.montantEstimeFcfa) : '—'}
                      </Td>
                      <Td className="text-xs text-muted">{formatShortDate(po.createdAt)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right ${mono ? 'font-mono text-ink' : 'text-ink'}`}>{value}</dd>
    </div>
  )
}
