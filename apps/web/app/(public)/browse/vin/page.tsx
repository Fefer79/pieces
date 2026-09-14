'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface VinResult {
  vin: string
  make: string | null
  model: string | null
  year: number | null
  engine: string | null
  engines: string[]
  models: string[]
  decoded: boolean
}

const VIN_LENGTH = 17

/** Le VIN ne contient jamais I, O ni Q (confusion avec 1 et 0). */
function sanitizeVin(raw: string): string {
  return raw.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, VIN_LENGTH)
}

function VinDecodeInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [vin, setVin] = useState(() => sanitizeVin(searchParams.get('code') ?? ''))
  const [result, setResult] = useState<VinResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Complètent le décodage quand le VIN seul ne tranche pas.
  const [model, setModel] = useState('')
  const [engine, setEngine] = useState('')
  const [engineOptions, setEngineOptions] = useState<string[]>([])

  const decode = useCallback(async (code: string) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setModel('')
    setEngine('')
    setEngineOptions([])
    try {
      const res = await fetch('/api/v1/browse/vin-decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin: code }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors du décodage')
        return
      }
      const data = body.data as VinResult
      setResult(data)
      setModel(data.model ?? '')
      setEngine(data.engine ?? '')
      setEngineOptions(data.engines ?? [])
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [])

  // Le VIN arrive déjà saisi depuis /browse : on décode sans second clic.
  useEffect(() => {
    const code = sanitizeVin(searchParams.get('code') ?? '')
    if (code.length === VIN_LENGTH) void decode(code)
  }, [searchParams, decode])

  // Modèle choisi à la main : on recharge les motorisations du millésime.
  useEffect(() => {
    if (!result?.make || !model || result.model === model) return
    const params = result.year ? `?year=${result.year}` : ''
    const url = `/api/v1/browse/brands/${encodeURIComponent(result.make)}/models/${encodeURIComponent(model)}/engines${params}`
    let cancelled = false
    fetch(url)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body) => {
        if (cancelled) return
        setEngineOptions(body.data ?? [])
        setEngine('')
      })
      .catch(() => {
        if (!cancelled) setEngineOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [result, model])

  function goToParts() {
    if (!result?.make) return
    const segments = [encodeURIComponent(result.make)]
    if (model) segments.push(encodeURIComponent(model))
    if (model && result.year) segments.push(String(result.year))
    const query = engine ? `?engine=${encodeURIComponent(engine)}` : ''
    router.push(`/browse/${segments.join('/')}${query}`)
  }

  const identified = result?.decoded === true
  // La motorisation ne bloque pas : le VIN ne l'encode pas toujours, et la
  // liste de pièces se filtre très bien sans elle.
  const canSearch = Boolean(identified && model && result?.year)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <button onClick={() => router.back()} className="mb-2 text-sm text-ink-2 hover:underline">
        &larr; Retour
      </button>
      <h1 className="mb-2 text-xl font-bold text-ink">Décodage VIN</h1>
      <p className="mb-4 text-sm text-muted">Saisissez le VIN à 17 caractères de la carte grise.</p>

      <input
        type="text"
        value={vin}
        onChange={(e) => setVin(sanitizeVin(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && vin.length === VIN_LENGTH && !loading) void decode(vin)
        }}
        placeholder="Ex: JTDKN3DU5A0123456"
        maxLength={VIN_LENGTH}
        className="mb-2 w-full rounded-sm border border-border-strong bg-card px-4 py-3 font-mono text-sm tracking-wider text-ink outline-none focus:border-ink-2"
      />
      <p className="mb-4 text-xs text-muted-2">{vin.length}/{VIN_LENGTH} caractères</p>

      <button
        onClick={() => void decode(vin)}
        disabled={vin.length !== VIN_LENGTH || loading}
        className="w-full rounded-md bg-ink-2 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:bg-border-strong"
      >
        {loading ? 'Décodage...' : 'Décoder le VIN'}
      </button>

      {error && <p className="mt-4 text-sm text-error-fg">{error}</p>}

      {loading && (
        <div className="mt-4 rounded-md border border-border bg-card p-4" aria-live="polite">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Décodage en cours
          </p>
          <div className="mt-3 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded-sm bg-surface" />
            <div className="h-4 w-1/2 animate-pulse rounded-sm bg-surface" />
            <div className="h-4 w-2/5 animate-pulse rounded-sm bg-surface" />
          </div>
        </div>
      )}

      {identified && result && (
        <div className="mt-4 rounded-md border border-border bg-card p-4">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Véhicule identifié
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Marque</dt>
              <dd className="font-semibold text-ink">{result.make}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Année</dt>
              <dd className="font-semibold text-ink">{result.year ?? '—'}</dd>
            </div>
          </dl>

          <div className="mt-3">
            <label htmlFor="vin-model" className="text-xs text-muted">Modèle</label>
            {result.model ? (
              <p id="vin-model" className="text-sm font-semibold text-ink">{result.model}</p>
            ) : (
              <select
                id="vin-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink-2"
              >
                <option value="">— Choisir le modèle —</option>
                {result.models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
          </div>

          <div className="mt-3">
            <p className="text-xs text-muted">Motorisation</p>
            {result.engine ? (
              <p className="text-sm font-semibold text-ink">{result.engine}</p>
            ) : engineOptions.length === 0 ? (
              <p className="text-sm text-muted-2">{model ? 'Non répertoriée' : '—'}</p>
            ) : engineOptions.length <= 6 ? (
              // Peu de candidates : des puces, choisies d'un geste, plutôt
              // qu'un menu à ouvrir.
              <div className="mt-1 flex flex-wrap gap-2">
                {engineOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={engine === option}
                    onClick={() => setEngine(engine === option ? '' : option)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      engine === option
                        ? 'border-ink-2 bg-ink-2 text-white'
                        : 'border-border-strong text-ink hover:border-ink-2'
                    }`}
                    style={{ minHeight: 36 }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <select
                aria-label="Motorisation"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                className="mt-1 w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink-2"
              >
                <option value="">Toutes les motorisations</option>
                {engineOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            )}
            {!result.engine && engineOptions.length > 0 && (
              <p className="mt-1.5 text-xs text-muted">
                Le VIN ne désigne pas la motorisation — affinez si vous la connaissez, sinon
                continuez, la liste reste valable.
              </p>
            )}
          </div>

          {!result.model && (
            <p className="mt-3 text-xs text-muted">
              Le VIN donne la marque et l&apos;année ; les constructeurs hors USA ne publient pas le
              modèle — choisissez-le dans la liste du millésime.
            </p>
          )}

          <button
            onClick={goToParts}
            disabled={!canSearch}
            className="mt-4 w-full rounded-md bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:bg-border-strong"
          >
            Chercher des pièces pour ce véhicule &rarr;
          </button>
        </div>
      )}

      {result && !result.decoded && (
        <div className="mt-4 rounded-md border border-border bg-warn-bg p-4">
          <p className="text-sm text-warn-fg">
            VIN non reconnu
            {result.year ? ` (millésime probable : ${result.year})` : ''} — essayez la navigation par
            marque/modèle/année.
          </p>
          <button onClick={() => router.push('/browse')} className="mt-2 text-sm text-ink-2 hover:underline">
            Naviguer par marque &rarr;
          </button>
        </div>
      )}
    </div>
  )
}

export default function VinDecodePage() {
  return (
    <Suspense fallback={null}>
      <VinDecodeInner />
    </Suspense>
  )
}
