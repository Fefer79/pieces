'use client'

// Écran « Contrats vendeurs » du back-office.
//
// Il existe pour le terrain : un commercial (capacité `crm:read`) doit pouvoir
// émettre un contrat et le faire signer dans la foulée d'un accord verbal, sans
// passer par l'écran Vendeurs réservé à `erp:admin` ni attendre l'aval d'un
// administrateur. La liaison fait la même chose depuis la fiche vendeur de son
// espace.

import { useCallback, useEffect, useState } from 'react'
import { Chip } from '@/components/ui/chip'
import { ContractLinkGenerator } from '@/components/contract-link-generator'
import {
  listVendorContracts,
  contractPdfUrl,
  contractWhatsAppUrl,
  type VendorContractSummary,
} from '@/lib/vendor-contract-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AdminVendorContractsPage() {
  const [contracts, setContracts] = useState<VendorContractSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // setState dans le callback de la promesse, jamais depuis le corps de l'effet
  // (règle react-hooks/set-state-in-effect).
  const load = useCallback(
    () =>
      listVendorContracts().then((r) => {
        if (r.ok) setContracts(r.data)
        else setError(r.message)
        setLoading(false)
      }),
    [],
  )

  useEffect(() => {
    listVendorContracts().then((r) => {
      if (r.ok) setContracts(r.data)
      else setError(r.message)
      setLoading(false)
    })
  }, [])

  const signed = contracts.filter((c) => c.status === 'ACCEPTED').length
  const pending = contracts.filter((c) => c.status === 'PENDING').length

  return (
    <div className="p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Contrats vendeurs</h1>
          <p className="mt-1 text-sm text-muted">
            {signed} signé{signed > 1 ? 's' : ''} · {pending} en attente de signature
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ContractLinkGenerator onCreated={load} />
          <button
            onClick={load}
            className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card"
          >
            Actualiser
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-md border border-error-fg/30 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : contracts.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted">
            Aucun contrat émis. Générez un lien : le vendeur peut le signer sur place,
            avant même la mise en vente de ses pièces.
          </p>
        </div>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Vendeur</Th>
              <Th>Téléphone</Th>
              <Th>Statut</Th>
              <Th>Émis le</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {contracts.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <span className="font-medium text-ink">{c.sellerName}</span>
                  {c.shopName && <span className="text-muted"> · {c.shopName}</span>}
                </Td>
                <Td>{c.phone ?? '—'}</Td>
                <Td>
                  {c.status === 'ACCEPTED' ? (
                    <Chip variant="status-ok">
                      Signé{c.signedAt ? ` le ${formatDate(c.signedAt)}` : ''}
                    </Chip>
                  ) : c.status === 'REVOKED' ? (
                    <Chip variant="status-err">Révoqué</Chip>
                  ) : (
                    <Chip variant="status-warn">À signer</Chip>
                  )}
                </Td>
                <Td>{formatDate(c.createdAt)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {c.status === 'PENDING' && (
                      <>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-ink-2 hover:underline"
                        >
                          Faire signer
                        </a>
                        {c.phone && (
                          <a
                            href={contractWhatsAppUrl(c)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted hover:text-ink hover:underline"
                          >
                            WhatsApp
                          </a>
                        )}
                      </>
                    )}
                    <a
                      href={contractPdfUrl(c.token)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted hover:text-ink hover:underline"
                    >
                      PDF
                    </a>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
