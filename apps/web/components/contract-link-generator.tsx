'use client'

// Génération d'un lien de contrat pour un vendeur pas encore inscrit (prospect
// démarché sur le terrain). Pour un vendeur déjà onboardé, la fiche vendeur
// porte le bloc dédié — voir `vendor-contract-card.tsx`.

import { useState } from 'react'
import {
  createVendorContract,
  contractPdfUrl,
  contractWhatsAppUrl,
  type VendorContractSummary,
} from '@/lib/vendor-contract-api'

export function ContractLinkGenerator({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [sellerName, setSellerName] = useState('')
  const [shopName, setShopName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<VendorContractSummary | null>(null)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setErr(null)
    if (sellerName.trim().length < 2) {
      setErr('Le nom du vendeur est requis.')
      return
    }
    setBusy(true)
    const r = await createVendorContract({
      sellerName: sellerName.trim(),
      ...(shopName.trim() ? { shopName: shopName.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    })
    setBusy(false)
    if (!r.ok) {
      setErr(r.message)
      return
    }
    setResult(r.data)
    onCreated?.()
  }

  function reset() {
    setResult(null)
    setSellerName('')
    setShopName('')
    setPhone('')
    setErr(null)
    setCopied(false)
  }

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
            {/* Signature immédiate : le vendeur signe sur le téléphone de l'agent,
                sans attendre de recevoir le lien. */}
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="block rounded-md bg-accent px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-accent-hover">
              Faire signer maintenant
            </a>
            <div className="flex flex-wrap gap-2">
              <a href={contractWhatsAppUrl(result, phone)} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-md bg-[#25D366] px-4 py-2.5 text-center text-sm font-medium text-white hover:opacity-90">
                Envoyer via WhatsApp
              </a>
              <a href={contractPdfUrl(result.token)} target="_blank" rel="noopener noreferrer" className="rounded-md border border-border-strong px-4 py-2.5 text-sm hover:bg-surface">
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
