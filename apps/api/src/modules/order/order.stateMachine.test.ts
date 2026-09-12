import { describe, it, expect } from 'vitest'
import { canTransition, getValidTransitions, isImportOnlyStatus } from './order.stateMachine.js'

describe('order.stateMachine', () => {
  it('allows DRAFT → PENDING_PAYMENT', () => {
    expect(canTransition('DRAFT', 'PENDING_PAYMENT')).toBe(true)
  })

  it('allows DRAFT → PAID (COD)', () => {
    expect(canTransition('DRAFT', 'PAID')).toBe(true)
  })

  it('allows DRAFT → CANCELLED', () => {
    expect(canTransition('DRAFT', 'CANCELLED')).toBe(true)
  })

  it('disallows DRAFT → DELIVERED', () => {
    expect(canTransition('DRAFT', 'DELIVERED')).toBe(false)
  })

  it('disallows COMPLETED → anything', () => {
    expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false)
  })

  it('disallows CANCELLED → anything', () => {
    expect(canTransition('CANCELLED', 'PAID')).toBe(false)
  })

  it('allows PAID → VENDOR_CONFIRMED', () => {
    expect(canTransition('PAID', 'VENDOR_CONFIRMED')).toBe(true)
  })

  it('allows PAID → CANCELLED', () => {
    expect(canTransition('PAID', 'CANCELLED')).toBe(true)
  })

  it('allows DELIVERED → CONFIRMED', () => {
    expect(canTransition('DELIVERED', 'CONFIRMED')).toBe(true)
  })

  it('allows DELIVERED → COMPLETED (48h auto)', () => {
    expect(canTransition('DELIVERED', 'COMPLETED')).toBe(true)
  })

  it('getValidTransitions returns correct list for DRAFT', () => {
    const valid = getValidTransitions('DRAFT')
    expect(valid).toContain('PENDING_PAYMENT')
    expect(valid).toContain('PAID')
    expect(valid).toContain('CANCELLED')
    expect(valid).not.toContain('DELIVERED')
  })

  // -------------------------------------------------------------------------
  // Précommande d'import : acompte → acheminement → solde → flux commun
  // -------------------------------------------------------------------------

  describe("chemin de la précommande d'import", () => {
    it('déroule acompte → acheminement → solde appelé → payé', () => {
      expect(canTransition('PENDING_PAYMENT', 'DEPOSIT_PAID')).toBe(true)
      expect(canTransition('DEPOSIT_PAID', 'IN_IMPORT')).toBe(true)
      expect(canTransition('IN_IMPORT', 'AWAITING_BALANCE')).toBe(true)
      expect(canTransition('AWAITING_BALANCE', 'PAID')).toBe(true)
    })

    it('rejoint le flux commun après le solde', () => {
      expect(canTransition('PAID', 'VENDOR_CONFIRMED')).toBe(true)
    })

    it('reste annulable à chaque étape (remboursement de l’acompte)', () => {
      expect(canTransition('DEPOSIT_PAID', 'CANCELLED')).toBe(true)
      expect(canTransition('IN_IMPORT', 'CANCELLED')).toBe(true)
      expect(canTransition('AWAITING_BALANCE', 'CANCELLED')).toBe(true)
    })

    it('ne saute pas le solde : pas de DEPOSIT_PAID → PAID', () => {
      expect(canTransition('DEPOSIT_PAID', 'PAID')).toBe(false)
      expect(canTransition('DEPOSIT_PAID', 'DISPATCHED')).toBe(false)
      expect(canTransition('IN_IMPORT', 'PAID')).toBe(false)
    })

    it('marque les trois états comme réservés à l’import', () => {
      expect(isImportOnlyStatus('DEPOSIT_PAID')).toBe(true)
      expect(isImportOnlyStatus('IN_IMPORT')).toBe(true)
      expect(isImportOnlyStatus('AWAITING_BALANCE')).toBe(true)
      expect(isImportOnlyStatus('PAID')).toBe(false)
      expect(isImportOnlyStatus('DRAFT')).toBe(false)
    })

    it('laisse le chemin local intact', () => {
      expect(canTransition('PENDING_PAYMENT', 'PAID')).toBe(true)
      expect(getValidTransitions('PAID')).toEqual(['VENDOR_CONFIRMED', 'CANCELLED'])
    })
  })

})
