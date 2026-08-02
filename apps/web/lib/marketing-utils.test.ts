import { describe, expect, it } from 'vitest'
import {
  AUDIENCE_TYPE_LABELS,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_VARIANTS,
  formatDate,
  formatDateTime,
} from './marketing-utils'

describe('CAMPAIGN_STATUS_LABELS', () => {
  it('couvre tous les statuts de campagne', () => {
    expect(Object.keys(CAMPAIGN_STATUS_LABELS).sort()).toEqual(
      ['ANNULEE', 'BROUILLON', 'EN_COURS', 'PLANIFIEE', 'TERMINEE'].sort(),
    )
  })
})

describe('CAMPAIGN_STATUS_VARIANTS', () => {
  it('couvre tous les statuts de campagne', () => {
    expect(Object.keys(CAMPAIGN_STATUS_VARIANTS).sort()).toEqual(
      Object.keys(CAMPAIGN_STATUS_LABELS).sort(),
    )
  })
})

describe('AUDIENCE_TYPE_LABELS', () => {
  it('couvre tous les types d’audience', () => {
    expect(Object.keys(AUDIENCE_TYPE_LABELS).sort()).toEqual(
      ['SEGMENT_CLIENT', 'SEGMENT_VENDEUR', 'TAG'].sort(),
    )
  })
})

describe('formatDate', () => {
  it('retourne un tiret quand la date est absente', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  it('formate une date ISO en fr-FR', () => {
    expect(formatDate('2026-08-02T10:00:00.000Z')).toBe(
      new Date('2026-08-02T10:00:00.000Z').toLocaleDateString('fr-FR'),
    )
  })
})

describe('formatDateTime', () => {
  it('retourne un tiret quand la date est absente', () => {
    expect(formatDateTime(null)).toBe('—')
  })

  it('formate une date ISO avec l’heure en fr-FR', () => {
    expect(formatDateTime('2026-08-02T10:00:00.000Z')).toBe(
      new Date('2026-08-02T10:00:00.000Z').toLocaleString('fr-FR'),
    )
  })
})
