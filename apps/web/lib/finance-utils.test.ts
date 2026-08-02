import { describe, it, expect } from 'vitest'
import {
  currentPeriode,
  formatPeriode,
  recentPeriodes,
  formatVariation,
  variationTone,
} from './finance-utils'

describe('périodes', () => {
  it('currentPeriode formate en YYYY-MM (UTC)', () => {
    expect(currentPeriode(new Date('2026-08-02T10:00:00Z'))).toBe('2026-08')
  })

  it('formatPeriode rend le mois en français', () => {
    expect(formatPeriode('2026-08')).toBe('août 2026')
    expect(formatPeriode('2026-01')).toBe('janvier 2026')
    expect(formatPeriode('2026-12')).toBe('décembre 2026')
  })

  it('formatPeriode retourne l’entrée si mal formée', () => {
    expect(formatPeriode('N/A')).toBe('N/A')
    expect(formatPeriode('2026')).toBe('2026')
  })

  it('recentPeriodes enchaîne les mois à rebours, année comprise', () => {
    expect(recentPeriodes(4, new Date('2026-02-10T00:00:00Z'))).toEqual([
      '2026-02',
      '2026-01',
      '2025-12',
      '2025-11',
    ])
  })
})

describe('formatVariation', () => {
  it('null → tiret (pas de point de comparaison)', () => {
    expect(formatVariation(null)).toBe('—')
  })

  it('signe explicite : « + » si positif, « − » si négatif', () => {
    expect(formatVariation(20)).toBe('+20 %')
    expect(formatVariation(12.5)).toBe('+12.5 %')
    expect(formatVariation(-50)).toBe('−50 %')
    expect(formatVariation(-7.5)).toBe('−7.5 %')
  })

  it('zéro sans signe', () => {
    expect(formatVariation(0)).toBe('0 %')
  })
})

describe('variationTone', () => {
  it('vert si positif, rouge si négatif, neutre sinon', () => {
    expect(variationTone(20)).toBe('text-success-fg')
    expect(variationTone(-50)).toBe('text-error-fg')
    expect(variationTone(0)).toBe('text-muted')
    expect(variationTone(null)).toBe('text-muted')
  })
})
