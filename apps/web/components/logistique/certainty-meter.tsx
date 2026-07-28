'use client'

import {
  computeCertainty,
  nextBestSignal,
  certaintyLevelSpec,
  type LeadCertaintySignals,
} from '@/lib/logistique-content'

// Jauge d'identification. Jamais bloquante, jamais moralisatrice : elle affiche
// ce qu'on sait, et propose UNE action — celle qui rapporte le plus de points.
//
// ⚠ Cet axe (« sait-on quelle pièce sur quel véhicule ») est distinct de
// LogisticsConfidence (« connaît-on le poids/volume »), affiché ailleurs.

const TONE_CLASS = {
  warn: { bar: 'bg-warn-fg', text: 'text-warn-fg', chip: 'bg-warn-bg text-warn-fg' },
  mid: { bar: 'bg-ink-2', text: 'text-ink-2', chip: 'bg-oem-bg text-oem-fg' },
  ok: { bar: 'bg-success-fg', text: 'text-success-fg', chip: 'bg-success-bg text-success-fg' },
} as const

export function CertaintyMeter({ signals }: { signals: LeadCertaintySignals }) {
  const { score, level } = computeCertainty(signals)
  const spec = certaintyLevelSpec(level)
  const tone = TONE_CLASS[spec.tone]
  const next = nextBestSignal(signals)

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          Identification
        </span>
        <span className={`tabular font-mono text-[15px] ${tone.text}`}>{score} %</span>
      </div>

      <div
        className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-surface"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Niveau d'identification de la pièce et du véhicule"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${tone.bar}`}
          style={{ width: `${score}%` }}
        />
        {/* Crans des seuils 40 % et 70 % */}
        <span className="absolute inset-y-0 left-[40%] w-px bg-border-strong" aria-hidden="true" />
        <span className="absolute inset-y-0 left-[70%] w-px bg-border-strong" aria-hidden="true" />
      </div>

      <div className="mt-3">
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] ${tone.chip}`}
        >
          {spec.label}
        </span>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{spec.body}</p>
      </div>

      {next && (
        <p className="mt-3 border-t border-border pt-3 text-[13px] leading-relaxed text-ink">
          <span className="tabular font-mono text-accent">+ {next.gain} points</span> — {next.label}.
        </p>
      )}
    </div>
  )
}
