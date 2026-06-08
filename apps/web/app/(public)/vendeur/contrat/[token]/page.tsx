'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ContractArticle {
  number: number
  title: string
  paragraphs: string[]
  bullets?: string[]
}

interface ContractContent {
  title: string
  subtitle: string
  editor: { name: string; description: string; contact: string }
  preamble: string[]
  articles: ContractArticle[]
  closing: string[]
}

interface ContractData {
  token: string
  contractVersion: string
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED'
  sellerName: string
  shopName: string | null
  phone: string | null
  signedName: string | null
  signedAt: string | null
  content: ContractContent
}

export default function VendorContractPage() {
  const params = useParams()
  const token = params.token as string

  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [signedName, setSignedName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fetchContract = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/vendor-contracts/${token}`)
      if (!res.ok) {
        setError(res.status === 404 ? 'Contrat introuvable ou lien expiré.' : 'Erreur de chargement.')
        return
      }
      const body = await res.json()
      setContract(body.data)
      if (body.data?.sellerName && !signedName) setSignedName(body.data.sellerName)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    fetchContract()
  }, [fetchContract])

  async function handleSign() {
    setSubmitError(null)
    if (signedName.trim().length < 2) {
      setSubmitError('Veuillez saisir votre nom complet.')
      return
    }
    if (!accepted) {
      setSubmitError('Vous devez cocher la case d’acceptation.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/vendor-contracts/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedName: signedName.trim(), accepted: true }),
      })
      const body = await res.json()
      if (!res.ok) {
        setSubmitError(body?.error?.message ?? 'Échec de la signature.')
        return
      }
      await fetchContract()
    } catch {
      setSubmitError('Erreur réseau. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center text-muted">Chargement du contrat…</main>
    )
  }

  if (error || !contract) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="text-xl font-semibold text-ink">Contrat indisponible</h1>
        <p className="mt-2 text-muted">{error ?? 'Contrat introuvable.'}</p>
      </main>
    )
  }

  const { content } = contract
  const pdfUrl = `/api/v1/vendor-contracts/${token}/pdf`
  const isSigned = contract.status === 'ACCEPTED'

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      {/* Header */}
      <header className="mb-8 border-b border-border pb-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-2xl font-bold tracking-tight text-ink">
            Pièces<span className="text-accent">.</span>
          </p>
          <p className="text-right text-xs text-muted">
            Version {contract.contractVersion}
          </p>
        </div>
        <h1 className="mt-5 text-2xl font-semibold leading-tight text-ink">{content.title}</h1>
        <p className="mt-1.5 text-muted">{content.subtitle}</p>
        <p className="mt-4 text-sm text-ink">
          <span className="text-muted">Vendeur : </span>
          <span className="font-medium">
            {contract.sellerName}
            {contract.shopName ? ` — ${contract.shopName}` : ''}
          </span>
          {contract.phone ? <span className="text-muted"> · {contract.phone}</span> : null}
        </p>
      </header>

      {/* Signed banner */}
      {isSigned && (
        <div className="mb-8 rounded-lg border border-[var(--color-success-fg)]/30 bg-[var(--color-success-bg)] px-5 py-4">
          <p className="font-semibold text-[var(--color-success-fg)]">✓ Contrat signé</p>
          <p className="mt-1 text-sm text-ink">
            Signé par <strong>{contract.signedName}</strong>
            {contract.signedAt
              ? ` le ${new Date(contract.signedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`
              : ''}
            .
          </p>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
            <Button variant="secondary" size="sm">
              Télécharger le PDF signé
            </Button>
          </a>
        </div>
      )}

      {/* Préambule */}
      <section className="space-y-3 text-[15px] leading-relaxed text-ink">
        {content.preamble.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      {/* Articles */}
      <section className="mt-8 space-y-7">
        {content.articles.map((art) => (
          <article key={art.number}>
            <h2 className="text-base font-semibold text-ink">
              Article {art.number} — {art.title}
            </h2>
            <div className="mt-2 space-y-2.5 text-[15px] leading-relaxed text-ink">
              {art.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {art.bullets && (
              <ul className="mt-2.5 space-y-1.5">
                {art.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-ink">
                    <span aria-hidden className="font-semibold text-accent">
                      ▸
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>

      {/* Clôture */}
      <section className="mt-8 space-y-2 border-t border-border pt-6 text-sm italic text-muted">
        {content.closing.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      {/* Signature block */}
      {!isSigned && contract.status === 'PENDING' && (
        <section className="mt-8 rounded-xl border border-border-strong bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink">Signature électronique</h2>
          <p className="mt-1 text-sm text-muted">
            En signant, vous acceptez l’intégralité des conditions ci-dessus. Votre nom, la date et
            votre adresse IP sont enregistrés à titre de preuve.
          </p>

          <label className="mt-5 block text-sm font-medium text-ink">
            Nom complet
            <input
              type="text"
              value={signedName}
              onChange={(e) => setSignedName(e.target.value)}
              placeholder="Votre nom et prénom"
              className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-ink outline-none focus:border-ink"
            />
          </label>

          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4.5 w-4.5 shrink-0 accent-[var(--color-accent)]"
            />
            <span>
              J’ai lu et j’accepte les Conditions générales d’adhésion vendeur (version{' '}
              {contract.contractVersion}).
            </span>
          </label>

          {submitError && <p className="mt-3 text-sm text-[var(--color-error-fg,#B91C1C)]">{submitError}</p>}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={handleSign} disabled={submitting} variant="accent">
              {submitting ? 'Signature…' : 'Signer le contrat'}
            </Button>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost">Lire en PDF</Button>
            </a>
          </div>
        </section>
      )}

      {contract.status === 'REVOKED' && (
        <p className="mt-8 rounded-lg bg-surface px-5 py-4 text-center text-muted">
          Ce contrat n’est plus valable. Contactez Pièces pour un nouveau lien.
        </p>
      )}

      <footer className="mt-10 border-t border-border pt-5 text-center text-xs text-muted">
        Pièces — {content.editor.contact}
      </footer>
    </main>
  )
}
