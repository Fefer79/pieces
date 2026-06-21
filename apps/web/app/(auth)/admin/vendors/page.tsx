'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch, downloadCsv } from '@/lib/admin-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

interface Vendor {
  id: string
  shopName: string
  status: string
  phone: string
  user: { id: string; phone: string | null; email: string | null; name: string | null } | null
  _count: { catalogItems: number }
}
interface ListResponse {
  vendors: Vendor[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

interface GeneratedContract {
  token: string
  url: string
  contractVersion: string
  sellerName: string
}

function ContractLinkGenerator() {
  const [open, setOpen] = useState(false)
  const [sellerName, setSellerName] = useState('')
  const [shopName, setShopName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedContract | null>(null)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setErr(null)
    if (sellerName.trim().length < 2) {
      setErr('Le nom du vendeur est requis.')
      return
    }
    setBusy(true)
    try {
      const payload: Record<string, string> = { sellerName: sellerName.trim() }
      if (shopName.trim()) payload.shopName = shopName.trim()
      if (phone.trim()) payload.phone = phone.trim()
      const data = await adminFetch<GeneratedContract>('/vendor-contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setResult(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setResult(null)
    setSellerName('')
    setShopName('')
    setPhone('')
    setErr(null)
    setCopied(false)
  }

  const waDigits = phone.replace(/[^\d]/g, '')
  const waText = result
    ? encodeURIComponent(
        `Bonjour ${result.sellerName}, voici votre contrat d'adhésion vendeur Pièces à lire et signer en ligne : ${result.url}`,
      )
    : ''
  const waUrl = result ? `https://wa.me/${waDigits}?text=${waText}` : ''

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card"
      >
        + Lien de contrat
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Lien de contrat vendeur</h2>
          <button onClick={() => { setOpen(false); reset() }} className="text-muted hover:text-ink">✕</button>
        </div>

        {!result ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Générez un lien d’adhésion à envoyer au vendeur. Il pourra lire et signer le contrat en ligne.
            </p>
            <label className="block text-sm text-ink">
              Nom du vendeur *
              <input value={sellerName} onChange={(e) => setSellerName(e.target.value)} className="mt-1 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm text-ink">
              Boutique
              <input value={shopName} onChange={(e) => setShopName(e.target.value)} className="mt-1 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm text-ink">
              Téléphone (WhatsApp)
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225XXXXXXXXXX" className="mt-1 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm" />
            </label>
            {err && <p className="text-sm text-error-fg">{err}</p>}
            <button onClick={generate} disabled={busy} className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
              {busy ? 'Génération…' : 'Générer le lien'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink">
              Lien généré pour <strong>{result.sellerName}</strong> (v{result.contractVersion}).
            </p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
              <input readOnly value={result.url} className="w-full bg-transparent text-xs text-ink outline-none" />
              <button
                onClick={() => { navigator.clipboard.writeText(result.url); setCopied(true) }}
                className="shrink-0 rounded-sm border border-border-strong px-2 py-1 text-xs hover:bg-card"
              >
                {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-md bg-[#25D366] px-4 py-2.5 text-center text-sm font-medium text-white hover:opacity-90">
                Envoyer via WhatsApp
              </a>
              <a href={`/api/v1/vendor-contracts/${result.token}/pdf`} target="_blank" rel="noopener noreferrer" className="rounded-md border border-border-strong px-4 py-2.5 text-sm hover:bg-surface">
                PDF
              </a>
            </div>
            <button onClick={reset} className="w-full text-sm text-muted hover:text-ink">Générer un autre lien</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminVendorsPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('page', String(page))
    adminFetch<ListResponse>(`/admin/vendors/list?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [q, page])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Vendeurs</h1>
        <div className="flex gap-2">
          <ContractLinkGenerator />
          <button onClick={() => downloadCsv('vendors')} className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card">Export CSV</button>
        </div>
      </div>
      <input
        value={q}
        onChange={(e) => { setPage(1); setQ(e.target.value) }}
        placeholder="Rechercher (nom de la boutique, téléphone, email)"
        className="mb-3 w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
      />
      {error && <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">{error}</div>}
      {!data ? <div className="text-sm text-muted">Chargement…</div> : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Boutique</Th>
                  <Th>Contact</Th>
                  <Th>Statut</Th>
                  <Th align="right">Articles</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.vendors.map((v) => (
                  <Tr key={v.id}>
                    <Td>
                      <Link href={`/admin/vendors/${v.id}`} className="font-medium text-ink-2 hover:underline">{v.shopName}</Link>
                    </Td>
                    <Td className="text-xs">
                      <div>{v.user?.phone ?? v.phone}</div>
                      <div className="text-muted">{v.user?.email ?? ''}</div>
                    </Td>
                    <Td className="text-xs">{v.status}</Td>
                    <Td num>{v._count.catalogItems}</Td>
                  </Tr>
                ))}
                {data.vendors.length === 0 && <Tr hover={false}><Td colSpan={4} align="center" className="py-6 text-muted">Aucun vendeur.</Td></Tr>}
              </Tbody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>{data.pagination.total} vendeurs · page {data.pagination.page}/{data.pagination.totalPages}</div>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40">←</button>
              <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40">→</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
