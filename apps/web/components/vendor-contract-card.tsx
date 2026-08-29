'use client'

// Bloc « Contrat d'adhésion » d'une fiche vendeur.
//
// Pensé pour le terrain : le commercial ou la liaison obtient l'accord du
// vendeur, génère le lien en un appui et le fait signer sur place — sur le
// téléphone du vendeur (WhatsApp) ou sur celui de l'agent (« Faire signer
// maintenant », la page de signature étant publique). Aucune validation
// d'administrateur, aucune pièce à saisir au préalable.

import { useCallback, useEffect, useState } from 'react'
import { Chip } from '@/components/ui/chip'
import {
  listVendorContracts,
  createVendorContract,
  contractPdfUrl,
  contractWhatsAppUrl,
  type VendorContractSummary,
} from '@/lib/vendor-contract-api'

interface Props {
  vendorId: string
  shopName: string
  contactName?: string | null
  phone?: string | null
}

function formatSignedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function VendorContractCard({ vendorId, shopName, contactName, phone }: Props) {
  const [contract, setContract] = useState<VendorContractSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Le setState reste dans le callback de la promesse : appeler une fonction
  // qui met l'état à jour depuis le corps de l'effet déclenche des rendus en
  // cascade (règle react-hooks/set-state-in-effect).
  const load = useCallback(
    () =>
      listVendorContracts(vendorId).then((r) => {
        if (r.ok) {
          // Un contrat signé prime sur un lien en attente émis avant lui ; à
          // défaut, le plus récent (tri serveur).
          setContract(r.data.find((c) => c.status === 'ACCEPTED') ?? r.data[0] ?? null)
        } else {
          setError(r.message)
        }
        setLoading(false)
      }),
    [vendorId],
  )

  useEffect(() => {
    listVendorContracts(vendorId).then((r) => {
      if (!r.ok) {
        setError(r.message)
        setLoading(false)
        return
      }
      setContract(r.data.find((c) => c.status === 'ACCEPTED') ?? r.data[0] ?? null)
      setLoading(false)
    })
  }, [vendorId])

  async function generate() {
    setBusy(true)
    setError(null)
    const r = await createVendorContract({
      vendorId,
      sellerName: (contactName?.trim() || shopName).slice(0, 120),
      shopName: shopName || undefined,
      phone: phone || undefined,
    })
    setBusy(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    setContract(r.data)
  }

  const signed = contract?.status === 'ACCEPTED'

  return (
    <section className="mt-4 rounded-md border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
          Contrat d’adhésion
        </h2>
        {!loading &&
          (signed ? (
            <Chip variant="status-ok">Signé</Chip>
          ) : contract ? (
            <Chip variant="status-warn">À signer</Chip>
          ) : (
            <Chip variant="plain">Aucun contrat</Chip>
          ))}
      </div>

      {loading ? (
        <p className="mt-2 text-sm text-muted">Chargement…</p>
      ) : signed && contract ? (
        <>
          <p className="mt-2 text-sm text-ink">
            Signé par <strong>{contract.signedName}</strong>
            {contract.signedAt ? ` le ${formatSignedAt(contract.signedAt)}` : ''} · v
            {contract.contractVersion}
          </p>
          <a
            href={contractPdfUrl(contract.token)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-ink-2 hover:underline"
          >
            Voir le contrat signé (PDF)
          </a>
        </>
      ) : contract ? (
        <>
          <p className="mt-2 text-sm text-muted">
            Lien prêt. Faites-le signer maintenant, sur votre téléphone ou sur celui du
            vendeur.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href={contract.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-accent px-4 py-2.5 text-center text-sm font-medium text-white"
              style={{ minHeight: 44, lineHeight: '24px' }}
            >
              Faire signer maintenant
            </a>
            <div className="flex gap-2">
              <a
                href={contractWhatsAppUrl(contract, phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-md border border-border-strong px-3 py-2.5 text-center text-sm text-ink"
                style={{ minHeight: 44, lineHeight: '24px' }}
              >
                Envoyer via WhatsApp
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(contract.url)
                  setCopied(true)
                }}
                className="rounded-md border border-border-strong px-3 py-2.5 text-sm text-ink"
                style={{ minHeight: 44 }}
              >
                {copied ? 'Copié' : 'Copier'}
              </button>
              <a
                href={contractPdfUrl(contract.token)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-border-strong px-3 py-2.5 text-sm text-ink"
                style={{ minHeight: 44, lineHeight: '24px' }}
              >
                PDF
              </a>
            </div>
            <button
              type="button"
              onClick={load}
              className="text-sm text-muted hover:text-ink"
            >
              Actualiser le statut
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Le vendeur peut signer dès maintenant, avant même la mise en vente de ses
            pièces.
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="mt-3 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ minHeight: 44 }}
          >
            {busy ? 'Génération…' : 'Générer le contrat à signer'}
          </button>
        </>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-error-fg/30 bg-error-bg p-2.5 text-sm text-error-fg">
          {error}
        </p>
      )}
    </section>
  )
}
