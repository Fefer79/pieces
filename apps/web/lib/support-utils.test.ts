import { describe, it, expect } from 'vitest'
import {
  DISPUTE_STATUS_LABELS,
  DISPUTE_STATUS_VARIANTS,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_VARIANTS,
  RETURN_REASON_LABELS,
  NEXT_RETURN_STATUSES,
  formatDate,
  formatDateTime,
} from './support-utils'
import type { DisputeStatus, ReturnReason, ReturnStatus } from './support-api'

const DISPUTE_STATUSES: DisputeStatus[] = [
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED_BUYER',
  'RESOLVED_SELLER',
  'CLOSED',
]

const RETURN_STATUSES: ReturnStatus[] = [
  'REQUESTED',
  'ACCEPTED',
  'PICKED_UP',
  'INSPECTED',
  'REFUNDED',
  'REJECTED',
  'CANCELLED',
]

const RETURN_REASONS: ReturnReason[] = [
  'DEFECTIVE',
  'WRONG_PART',
  'NOT_AS_DESCRIBED',
  'NO_LONGER_NEEDED',
  'OTHER',
]

describe('libellés et variantes des statuts', () => {
  it('les Records couvrent toutes les valeurs des enums', () => {
    for (const s of DISPUTE_STATUSES) {
      expect(DISPUTE_STATUS_LABELS[s]).toBeTruthy()
      expect(DISPUTE_STATUS_VARIANTS[s]).toBeTruthy()
    }
    for (const s of RETURN_STATUSES) {
      expect(RETURN_STATUS_LABELS[s]).toBeTruthy()
      expect(RETURN_STATUS_VARIANTS[s]).toBeTruthy()
    }
    for (const r of RETURN_REASONS) {
      expect(RETURN_REASON_LABELS[r]).toBeTruthy()
    }
  })

  it('variantes des statuts de litige', () => {
    expect(DISPUTE_STATUS_VARIANTS.OPEN).toBe('status-err')
    expect(DISPUTE_STATUS_VARIANTS.UNDER_REVIEW).toBe('status-warn')
    expect(DISPUTE_STATUS_VARIANTS.RESOLVED_BUYER).toBe('status-ok')
    expect(DISPUTE_STATUS_VARIANTS.RESOLVED_SELLER).toBe('status-ok')
    expect(DISPUTE_STATUS_VARIANTS.CLOSED).toBe('plain')
  })

  it('variantes des statuts de retour', () => {
    expect(RETURN_STATUS_VARIANTS.REQUESTED).toBe('status-err')
    expect(RETURN_STATUS_VARIANTS.ACCEPTED).toBe('status-warn')
    expect(RETURN_STATUS_VARIANTS.PICKED_UP).toBe('status-warn')
    expect(RETURN_STATUS_VARIANTS.INSPECTED).toBe('status-warn')
    expect(RETURN_STATUS_VARIANTS.REFUNDED).toBe('status-ok')
    expect(RETURN_STATUS_VARIANTS.REJECTED).toBe('plain')
    expect(RETURN_STATUS_VARIANTS.CANCELLED).toBe('plain')
  })

  it('libellés français', () => {
    expect(DISPUTE_STATUS_LABELS.UNDER_REVIEW).toBe("En cours d'examen")
    expect(DISPUTE_STATUS_LABELS.RESOLVED_BUYER).toBe('Résolu (client)')
    expect(RETURN_STATUS_LABELS.PICKED_UP).toBe('Récupéré')
    expect(RETURN_REASON_LABELS.NO_LONGER_NEEDED).toBe('Plus besoin')
  })
})

describe('NEXT_RETURN_STATUSES (machine à états)', () => {
  it('couvre toutes les valeurs de l’enum', () => {
    for (const s of RETURN_STATUSES) {
      expect(NEXT_RETURN_STATUSES[s]).toBeDefined()
    }
  })

  it('reproduit la machine du module returns', () => {
    expect(NEXT_RETURN_STATUSES.REQUESTED).toEqual(['ACCEPTED', 'REJECTED', 'CANCELLED'])
    expect(NEXT_RETURN_STATUSES.ACCEPTED).toEqual(['PICKED_UP', 'CANCELLED'])
    expect(NEXT_RETURN_STATUSES.PICKED_UP).toEqual(['INSPECTED'])
    expect(NEXT_RETURN_STATUSES.INSPECTED).toEqual(['REFUNDED', 'REJECTED'])
  })

  it('les états finaux n’ont aucune transition', () => {
    expect(NEXT_RETURN_STATUSES.REFUNDED).toEqual([])
    expect(NEXT_RETURN_STATUSES.REJECTED).toEqual([])
    expect(NEXT_RETURN_STATUSES.CANCELLED).toEqual([])
  })
})

describe('dates', () => {
  it('formatDate formate ou met un tiret', () => {
    expect(formatDate('2026-08-02T10:00:00Z')).toBe(
      new Date('2026-08-02T10:00:00Z').toLocaleDateString('fr-FR'),
    )
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  it('formatDateTime formate ou met un tiret', () => {
    expect(formatDateTime('2026-08-02T10:00:00Z')).toBe(
      new Date('2026-08-02T10:00:00Z').toLocaleString('fr-FR'),
    )
    expect(formatDateTime(null)).toBe('—')
  })
})
