/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState } from 'react'
import { LOGISTICS_VIN_REGEX } from 'shared/validators'
import { decodeVin, type VinDecodeResult } from '@/lib/logistique/leads-api'
import { LEAD_FORM_COPY } from '@/lib/logistique-content'

/**
 * Saisie du VIN, 17 caractères, sans I/O/Q.
 *
 * ⚠ Le décodage passe par NHTSA VPIC, base américano-centrée : Bestune/FAW et
 * beaucoup d'imports japonais ne décodent pas. On ne conditionne donc RIEN à
 * `decoded === true` — le VIN brut est la preuve, décodé ou non. Un échec de
 * décodage n'est pas une erreur et ne doit jamais s'afficher comme telle.
 */
export function VinField({
  value,
  onChange,
  onDecoded,
  disabled,
}: {
  value: string
  onChange: (vin: string) => void
  onDecoded?: (result: VinDecodeResult) => void
  disabled?: boolean
}) {
  const [result, setResult] = useState<VinDecodeResult | null>(null)
  const [loading, setLoading] = useState(false)

  const isComplete = LOGISTICS_VIN_REGEX.test(value)

  useEffect(() => {
    if (!isComplete || disabled) {
      setResult(null)
      return
    }
    let cancelled = false
    setLoading(true)
    void decodeVin(value).then((res) => {
      if (cancelled) return
      setLoading(false)
      setResult(res)
      if (res?.decoded && onDecoded) onDecoded(res)
    })
    return () => {
      cancelled = true
    }
    // onDecoded est stable par construction côté appelant (useCallback).
  }, [value, isComplete, disabled, onDecoded])

  return (
    <div>
      <label htmlFor="vin" className="mb-1.5 block text-sm font-medium text-ink">
        Code VIN (17 caractères)
      </label>
      <p className="mb-2 text-[12.5px] leading-snug text-muted">
        Sur la carte grise (case E), le pare-brise côté conducteur ou le montant de portière. C&apos;est
        la preuve qui vaut le plus : elle verrouille la variante exacte du véhicule.
      </p>
      <input
        id="vin"
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        maxLength={17}
        disabled={disabled}
        value={value}
        onChange={(e) =>
          onChange(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17))
        }
        placeholder="LFPH4ACX7R1000001"
        className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 font-mono text-sm tracking-[0.08em] text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-accent disabled:bg-surface disabled:text-muted"
      />

      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <span className="tabular font-mono text-[11px] text-muted-2">{value.length}/17</span>
        {loading && <span className="text-[12.5px] text-muted">Vérification…</span>}
      </div>

      {result?.decoded && (
        <p className="mt-2 rounded-md bg-success-bg px-3 py-2 text-[13px] leading-relaxed text-success-fg">
          Véhicule reconnu : {[result.make, result.model, result.year].filter(Boolean).join(' ')}
        </p>
      )}
      {result && !result.decoded && (
        <p className="mt-2 rounded-md bg-surface px-3 py-2 text-[13px] leading-relaxed text-muted">
          {LEAD_FORM_COPY.vinNotDecoded}
        </p>
      )}
    </div>
  )
}
