'use client'

import { useState } from 'react'

interface ConsentModalProps {
  onConsented: () => void
  getAccessToken: () => Promise<string | null>
}

export function ConsentModal({ onConsented, getAccessToken }: ConsentModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    if (submitting) return
    setSubmitting(true)
    setError('')

    try {
      const token = await getAccessToken()
      if (!token) return

      const res = await fetch('/api/v1/users/me/consent', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accepted: true }),
      })

      if (!res.ok) {
        setError('Erreur lors de l\u2019enregistrement du consentement')
        return
      }

      onConsented()
    } catch {
      setError('Erreur de connexion')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
      <div role="dialog" aria-modal="true" aria-labelledby="consent-title" className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 id="consent-title" className="mb-4 text-lg font-bold text-gray-900">
          Protection de vos données
        </h2>

        <div className="mb-6 space-y-3 text-sm leading-relaxed text-gray-700">
          <p>
            Conformément à la loi n°2013-450 relative à la protection des données
            à caractère personnel en Côte d&apos;Ivoire, nous vous informons que
            Pièces.ci collecte et traite les données suivantes :
          </p>

          <ul className="list-disc space-y-1 pl-5">
            <li>Votre numéro de téléphone (identification)</li>
            <li>Votre historique de transactions (suivi commandes)</li>
            <li>Vos photos de pièces (identification pièces)</li>
          </ul>

          <p>
            Ces données sont utilisées uniquement pour le fonctionnement de la
            plateforme et ne sont jamais vendues à des tiers.
          </p>

          <p>Vous pouvez à tout moment :</p>

          <ul className="list-disc space-y-1 pl-5">
            <li>Consulter vos données (section &quot;Mes données&quot;)</li>
            <li>Demander la suppression de vos données</li>
          </ul>

          <p>
            En acceptant, vous consentez au traitement de vos données tel que
            décrit ci-dessus.
          </p>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleAccept}
          disabled={submitting}
          className="w-full rounded-lg bg-[#1976D2] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1565C0] disabled:opacity-50"
          style={{ minHeight: '48px' }}
        >
          {submitting ? 'Enregistrement...' : 'J\u2019accepte'}
        </button>
      </div>
    </div>
  )
}
