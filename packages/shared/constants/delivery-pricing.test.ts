import { describe, it, expect } from 'vitest'
import { computeDeliveryFee, gabaritOf, maxGabarit, GABARIT_BY_CATEGORY } from './delivery-pricing'
import { PART_CATEGORIES } from './categories'

// Raccourcis de lisibilité : un vendeur, une catégorie.
const v = (subtotal: number, category: string | null = 'Filtration') => ({
  subtotal,
  categories: [category],
})

describe('gabarit', () => {
  it('couvre toutes les catégories du catalogue', () => {
    for (const c of PART_CATEGORIES) expect(GABARIT_BY_CATEGORY[c]).toBeDefined()
  })

  it('lit la catégorie combinée "Cat / Sous-cat"', () => {
    expect(gabaritOf('Filtration / Filtre à huile')).toBe('S')
    expect(gabaritOf('Carrosserie extérieure / Pare-chocs')).toBe('XL')
  })

  it('retombe sur le gabarit moyen si inconnu ou absent', () => {
    expect(gabaritOf(null)).toBe('M')
    expect(gabaritOf('Catégorie inventée')).toBe('M')
  })

  it('retient la pièce la plus encombrante du lot', () => {
    expect(maxGabarit(['Filtration', 'Suspension', 'Allumage'])).toBe('L')
    expect(maxGabarit([])).toBe('S')
  })
})

describe('computeDeliveryFee', () => {
  it('retourne null sans commune valide', () => {
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: undefined, vendors: [v(60_000)] })).toBeNull()
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: '', vendors: [v(60_000)] })).toBeNull()
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Paris', vendors: [v(60_000)] })).toBeNull()
  })

  it('FREE standard : 3 % arrondi à la centaine', () => {
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Cocody', vendors: [v(60_000)] })).toBe(1800)
    // 3 % de 61 234 = 1 837,02 → arrondi 1 800
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Cocody', vendors: [v(61_234)] })).toBe(1800)
  })

  it('applique le plancher de zone sur les petits paniers', () => {
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Cocody', vendors: [v(10_000)] })).toBe(1500)
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Yopougon', vendors: [v(10_000)] })).toBe(2000)
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Bingerville', vendors: [v(10_000)] })).toBe(2500)
    // Plancher Pro réduit
    expect(computeDeliveryFee({ tier: 'PRO_FLOTTE', mode: 'STANDARD', commune: 'Cocody', vendors: [v(10_000)] })).toBe(1000)
  })

  it('le gabarit fait monter le plancher (même panier, pièce plus encombrante)', () => {
    const small = { tier: 'FREE', commune: 'Cocody', mode: 'STANDARD' } as const
    // 1 500 × facteur : S 1 → 1 500, M 1,3 → 2 000, L 1,8 → 2 700, XL 2,5 → 3 800
    expect(computeDeliveryFee({ ...small, vendors: [v(10_000, 'Filtration')] })).toBe(1500)
    expect(computeDeliveryFee({ ...small, vendors: [v(10_000, 'Freinage')] })).toBe(2000)
    expect(computeDeliveryFee({ ...small, vendors: [v(10_000, 'Suspension')] })).toBe(2700)
    expect(computeDeliveryFee({ ...small, vendors: [v(10_000, 'Carrosserie extérieure')] })).toBe(3800)
    // Zone périphérique + hors gabarit : 2 500 × 2,5 = 6 300
    expect(
      computeDeliveryFee({ ...small, commune: 'Bingerville', vendors: [v(10_000, 'Vitrage')] }),
    ).toBe(6300)
  })

  it('le montant du panier reprend la main au-delà du plancher gabarit', () => {
    // 3 % de 200 000 = 6 000 > plancher XL (3 800) : le montant reprend la main
    expect(
      computeDeliveryFee({
        tier: 'FREE',
        mode: 'STANDARD',
        commune: 'Cocody',
        vendors: [v(200_000, 'Carrosserie extérieure')],
      }),
    ).toBe(6000)
  })

  it('économique : moins cher que le standard, plafond plus bas', () => {
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'ECO', commune: 'Cocody', vendors: [v(10_000)] })).toBe(1500)
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'ECO', commune: 'Cocody', vendors: [v(200_000)] })).toBe(4000)
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'ECO', commune: 'Bingerville', vendors: [v(10_000)] })).toBe(2200)
    const big = [v(400_000), v(400_000), v(400_000)]
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'ECO', commune: 'Cocody', vendors: big })).toBe(6000)
    expect(computeDeliveryFee({ tier: 'PRO_FLOTTE', mode: 'ECO', commune: 'Cocody', vendors: big })).toBe(4000)
  })

  it('les trois délais sont ordonnés du moins cher au plus cher', () => {
    const args = { tier: 'FREE', commune: 'Yopougon', vendors: [v(120_000, 'Freinage')] } as const
    const eco = computeDeliveryFee({ ...args, mode: 'ECO' }) ?? 0
    const std = computeDeliveryFee({ ...args, mode: 'STANDARD' }) ?? 0
    const exp = computeDeliveryFee({ ...args, mode: 'EXPRESS' }) ?? 0
    expect(eco).toBeLessThan(std)
    expect(std).toBeLessThan(exp)
  })

  it('express : plancher 5 000 F et taux doublé', () => {
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'EXPRESS', commune: 'Cocody', vendors: [v(20_000)] })).toBe(5000)
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'EXPRESS', commune: 'Cocody', vendors: [v(150_000)] })).toBe(9000) // 6 %
    expect(computeDeliveryFee({ tier: 'PRO_FLOTTE', mode: 'EXPRESS', commune: 'Cocody', vendors: [v(150_000)] })).toBe(6000) // 4 %
  })

  it('plafonne par commande selon le palier', () => {
    const big = [v(400_000), v(400_000), v(400_000)]
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Cocody', vendors: big })).toBe(9000)
    expect(computeDeliveryFee({ tier: 'FREE', mode: 'EXPRESS', commune: 'Cocody', vendors: big })).toBe(19_900)
    expect(computeDeliveryFee({ tier: 'PRO_FLOTTE', mode: 'STANDARD', commune: 'Cocody', vendors: big })).toBe(5000)
    expect(computeDeliveryFee({ tier: 'PRO_FLOTTE', mode: 'EXPRESS', commune: 'Cocody', vendors: big })).toBe(9900)
  })

  it('somme les vendeurs (chacun expédie séparément) sous le plafond', () => {
    // 2 vendeurs à 60 000 → 2 × 1 800 = 3 600
    expect(
      computeDeliveryFee({ tier: 'FREE', mode: 'STANDARD', commune: 'Cocody', vendors: [v(60_000), v(60_000)] }),
    ).toBe(3600)
  })

  it('PRO_FLOTTE_PLUS : toujours offerte', () => {
    expect(computeDeliveryFee({ tier: 'PRO_FLOTTE_PLUS', mode: 'STANDARD', commune: 'Cocody', vendors: [v(60_000)] })).toBe(0)
    expect(computeDeliveryFee({ tier: 'PRO_FLOTTE_PLUS', mode: 'EXPRESS', commune: 'Bingerville', vendors: [v(1_000_000)] })).toBe(0)
  })
})
