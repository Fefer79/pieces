import { describe, it, expect } from 'vitest'
import { computeDeliveryFee } from './delivery-pricing'

describe('computeDeliveryFee', () => {
  it('retourne null sans commune valide', () => {
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: undefined, vendorSubtotals: [60_000] })).toBeNull()
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: '', vendorSubtotals: [60_000] })).toBeNull()
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Paris', vendorSubtotals: [60_000] })).toBeNull()
  })

  it('FREE standard : 3 % arrondi à la centaine', () => {
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Cocody', vendorSubtotals: [60_000] })).toBe(1800)
    // 3 % de 61 234 = 1 837,02 → arrondi 1 800
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Cocody', vendorSubtotals: [61_234] })).toBe(1800)
  })

  it('applique le plancher de zone sur les petits paniers', () => {
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Cocody', vendorSubtotals: [10_000] })).toBe(1500)
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Yopougon', vendorSubtotals: [10_000] })).toBe(2000)
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Bingerville', vendorSubtotals: [10_000] })).toBe(2500)
    // Plancher Pro réduit
    expect(computeDeliveryFee({ tier: 'PRO_FLOTTE', mode: 'STANDARD', commune: 'Cocody', vendorSubtotals: [10_000] })).toBe(1000)
  })

  it('express : plancher 5 000 F et taux doublé', () => {
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'EXPRESS', commune: 'Cocody', vendorSubtotals: [20_000] })).toBe(5000)
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'EXPRESS', commune: 'Cocody', vendorSubtotals: [150_000] })).toBe(9000) // 6 %
    expect(computeDeliveryFee({ tier: 'PRO_FLOTTE', mode: 'EXPRESS', commune: 'Cocody', vendorSubtotals: [150_000] })).toBe(6000) // 4 %
  })

  it('plafonne par commande selon le palier', () => {
    const big = [400_000, 400_000, 400_000]
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Cocody', vendorSubtotals: big })).toBe(9000)
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'EXPRESS', commune: 'Cocody', vendorSubtotals: big })).toBe(19_900)
    expect(computeDeliveryFee({ tier: 'PRO_FLOTTE', mode: 'STANDARD', commune: 'Cocody', vendorSubtotals: big })).toBe(5000)
    expect(computeDeliveryFee({ tier: 'PRO_FLOTTE', mode: 'EXPRESS', commune: 'Cocody', vendorSubtotals: big })).toBe(9900)
  })

  it('somme les vendeurs (chacun expédie séparément) sous le plafond', () => {
    // 2 vendeurs à 60 000 → 2 × 1 800 = 3 600
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Cocody', vendorSubtotals: [60_000, 60_000] })).toBe(3600)
  })

  it('PRO_FLOTTE_PLUS : toujours offerte', () => {
    expect(computeDeliveryFee({ tier: 'PRO_FLOTTE_PLUS', mode: 'STANDARD', commune: 'Cocody', vendorSubtotals: [60_000] })).toBe(0)
    expect(computeDeliveryFee({ tier: 'PRO_FLOTTE_PLUS', mode: 'EXPRESS', commune: 'Bingerville', vendorSubtotals: [1_000_000] })).toBe(0)
  })
})
