import { describe, it, expect } from 'vitest'
import { normalizeIvorianPhone } from './phone.js'

describe('normalizeIvorianPhone', () => {
  it('accepte un numéro local à 10 chiffres', () => {
    expect(normalizeIvorianPhone('0707000000')).toBe('+2250707000000')
  })

  it('restaure le zéro initial mangé par Excel', () => {
    expect(normalizeIvorianPhone('707000000')).toBe('+2250707000000')
  })

  it('tolère les séparateurs et l\'indicatif', () => {
    expect(normalizeIvorianPhone('+225 07 07 00 00 00')).toBe('+2250707000000')
    expect(normalizeIvorianPhone('225-07.07.00.00.00')).toBe('+2250707000000')
    expect(normalizeIvorianPhone('(+225) 0707 00 00 00')).toBe('+2250707000000')
  })

  it('rejette un indicatif étranger', () => {
    expect(normalizeIvorianPhone('+33612345678')).toBeNull()
  })

  it('rejette un numéro trop court ou trop long', () => {
    expect(normalizeIvorianPhone('0707')).toBeNull()
    expect(normalizeIvorianPhone('07070000000000')).toBeNull()
  })

  it('rejette le vide et le non-numérique', () => {
    expect(normalizeIvorianPhone('')).toBeNull()
    expect(normalizeIvorianPhone(null)).toBeNull()
    expect(normalizeIvorianPhone(undefined)).toBeNull()
    expect(normalizeIvorianPhone('pas un numéro')).toBeNull()
  })
})
