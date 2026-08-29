import { describe, it, expect } from 'vitest'
import { warrantyLabel, resolveWarranty, RETURN_POLICY } from './warranty'

describe('warrantyLabel', () => {
  it('annonce la durée quand le vendeur en accorde une', () => {
    expect(warrantyLabel(3, 'MONTH')).toEqual({ text: 'Garantie 3 mois', hasWarranty: true })
  })

  it('dit la vérité plutôt qu’une durée par défaut quand il n’y en a pas', () => {
    expect(warrantyLabel(null, null)).toEqual({
      text: 'Sans garantie commerciale',
      hasWarranty: false,
    })
    expect(warrantyLabel(0, 'DAY').hasWarranty).toBe(false)
  })
})

describe('resolveWarranty', () => {
  it('conserve la garantie choisie par le vendeur', () => {
    expect(resolveWarranty({ warrantyValue: 6, warrantyUnit: 'MONTH' })).toEqual({
      warrantyValue: 6,
      warrantyUnit: 'MONTH',
    })
  })

  it('accepte une garantie sur n’importe quelle pièce, consommables compris', () => {
    // Le vendeur décide sur toutes les familles, sans exception.
    expect(resolveWarranty({ warrantyValue: 15, warrantyUnit: 'DAY' })).toEqual({
      warrantyValue: 15,
      warrantyUnit: 'DAY',
    })
  })

  it('normalise l’absence de garantie à null plutôt qu’à un zéro trompeur', () => {
    expect(resolveWarranty({})).toEqual({ warrantyValue: null, warrantyUnit: null })
    expect(resolveWarranty({ warrantyValue: 0, warrantyUnit: 'MONTH' })).toEqual({
      warrantyValue: null,
      warrantyUnit: null,
    })
    // Durée sans unité : inexploitable, donc pas de garantie.
    expect(resolveWarranty({ warrantyValue: 3, warrantyUnit: null })).toEqual({
      warrantyValue: null,
      warrantyUnit: null,
    })
  })
})

describe('RETURN_POLICY', () => {
  it('couvre les trois cas de reprise du contrat v1.2', () => {
    expect(RETURN_POLICY.points).toHaveLength(3)
    expect(RETURN_POLICY.points.join(' ')).toMatch(/48 h/)
  })
})
