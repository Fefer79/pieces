import { describe, it, expect } from 'vitest'
import { canTransition, getValidTransitions } from './order.stateMachine.js'

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
})
