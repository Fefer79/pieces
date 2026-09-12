import { describe, expect, it } from 'vitest'
import {
  computeImportQuote,
  computePreorderSchedule,
  importQuoteOptions,
  parseImportFreightMode,
  supplyRubriqueLabel,
  originCountryLabel,
  type ImportQuoteItem,
} from './import-pricing'
import { CUSTOMS_DUTY_RATE, LOGISTICS_MODES } from './logistics'

const bougie: ImportQuoteItem = {
  name: "Bougie d'allumage NGK",
  category: 'Allumage / Bougies',
  quantity: 1,
  customsValue: 8_000,
}

const moteur: ImportQuoteItem = {
  name: 'Moteur complet 1.6 HDi',
  category: 'Moteur / Moteur complet',
  quantity: 1,
  weightKg: 140,
  customsValue: 900_000,
}

describe('computeImportQuote', () => {
  it('applique le minimum de perception sur une petite pièce', () => {
    const q = computeImportQuote([bougie], 'AIR_ECONOMY')
    expect(q.freightFee).toBe(LOGISTICS_MODES.AIR_ECONOMY.minimumCharge)
    expect(q.available).toBe(true)
  })

  it('facture au poids taxable dès que le colis est lourd', () => {
    const q = computeImportQuote([moteur], 'AIR_ECONOMY')
    const spec = LOGISTICS_MODES.AIR_ECONOMY
    expect(q.freightFee).toBeGreaterThan(spec.minimumCharge)
    expect(q.chargeableWeightKg).toBeGreaterThanOrEqual(140)
  })

  it('calcule la douane sur la valeur déclarée plus le fret', () => {
    const q = computeImportQuote([bougie], 'AIR_ECONOMY')
    const attendu = Math.round((CUSTOMS_DUTY_RATE * (8_000 + q.freightFee)) / 100) * 100
    expect(q.customsFee).toBe(attendu)
    expect(q.total).toBe(q.freightFee + q.customsFee)
  })

  it('ne facture jamais la douane sur le prix de vente public', () => {
    // Même pièce, marge de 100 % appliquée : la douane ne doit pas doubler.
    const auCout = computeImportQuote([bougie], 'AIR_ECONOMY')
    const auPrixPublic = computeImportQuote([{ ...bougie, customsValue: 16_000 }], 'AIR_ECONOMY')
    expect(auPrixPublic.customsFee).toBeGreaterThan(auCout.customsFee)
  })

  it('déclare le bateau indisponible sous le seuil de groupage, avec son motif', () => {
    const q = computeImportQuote([bougie], 'SEA_LCL')
    expect(q.available).toBe(false)
    expect(q.warnings.join(' ')).toMatch(/[Gg]roupage maritime/)
  })

  it('garde le bateau disponible sur une pièce volumineuse', () => {
    expect(computeImportQuote([moteur], 'SEA_LCL').available).toBe(true)
  })

  it('additionne les lignes et les quantités', () => {
    const une = computeImportQuote([moteur], 'AIR_ECONOMY')
    const deux = computeImportQuote([{ ...moteur, quantity: 2 }], 'AIR_ECONOMY')
    expect(deux.freightFee).toBeGreaterThan(une.freightFee)
    expect(deux.customsFee).toBeGreaterThan(une.customsFee)
  })

  it('renvoie un devis nul pour un lot vide', () => {
    const q = computeImportQuote([], 'AIR_NOW')
    expect(q.total).toBe(0)
    expect(q.available).toBe(true)
  })

  it('interdit l’aérien sur une matière restreinte', () => {
    const batterie: ImportQuoteItem = {
      name: 'Batterie 12V 70Ah',
      category: 'Électrique & batterie / Batterie',
      quantity: 1,
      customsValue: 60_000,
    }
    const air = computeImportQuote([batterie], 'AIR_NOW')
    if (air.warnings.some((w) => w.includes('restreinte'))) {
      expect(air.available).toBe(false)
      expect(computeImportQuote([batterie], 'SEA_LCL').warnings.join(' ')).not.toMatch(/restreinte/)
    }
  })
})

describe('importQuoteOptions', () => {
  it('renvoie les trois acheminements, du moins cher au plus cher', () => {
    const options = importQuoteOptions([moteur])
    expect(options).toHaveLength(3)
    expect(options.map((o) => o.total)).toEqual([...options.map((o) => o.total)].sort((a, b) => a - b))
    expect(new Set(options.map((o) => o.mode)).size).toBe(3)
  })

  it("l'express coûte plus cher que l'économique", () => {
    const options = importQuoteOptions([moteur])
    const eco = options.find((o) => o.mode === 'AIR_ECONOMY')
    const express = options.find((o) => o.mode === 'AIR_NOW')
    expect(eco).toBeDefined()
    expect(express).toBeDefined()
    expect(express?.total).toBeGreaterThan(eco?.total ?? 0)
    expect(express?.transitDays).toBeLessThan(eco?.transitDays ?? 0)
  })
})

describe('computePreorderSchedule', () => {
  const base = { partsTotal: 96_000, freightFee: 32_000, customsFee: 14_800, deliveryFee: 2_900 }

  it("l'acompte porte la moitié des pièces et tout l'acheminement", () => {
    const s = computePreorderSchedule(base)
    expect(s.partsDeposit).toBe(48_000)
    expect(s.depositAmount).toBe(48_000 + 32_000 + 14_800)
  })

  it('le solde porte le reste des pièces et la livraison locale', () => {
    const s = computePreorderSchedule(base)
    expect(s.balanceAmount).toBe(48_000 + 2_900)
  })

  it('acompte + solde retombent exactement sur le total', () => {
    for (const partsTotal of [96_000, 145_733, 7, 1_000_001]) {
      const s = computePreorderSchedule({ ...base, partsTotal })
      expect(s.depositAmount + s.balanceAmount).toBe(s.grandTotal)
    }
  })

  it('produit des montants payables en XOF (multiples de 5)', () => {
    const s = computePreorderSchedule({ ...base, partsTotal: 145_733 })
    expect(s.partsDeposit % 5).toBe(0)
  })
})

describe('supplyRubriqueLabel', () => {
  it('nomme les rubriques d’import', () => {
    expect(supplyRubriqueLabel('NEW', 'IMPORT')).toBe('Neuf à importer')
    expect(supplyRubriqueLabel('USED', 'IMPORT')).toBe('Occasion à importer')
    expect(supplyRubriqueLabel('REFURBISHED', 'IMPORT')).toBe('Ré-usiné à importer')
    expect(supplyRubriqueLabel(null, 'IMPORT')).toBe('Pièce à importer')
  })

  it('garde le vocabulaire historique en local', () => {
    expect(supplyRubriqueLabel('NEW', 'LOCAL')).toBe('Neuf')
    expect(supplyRubriqueLabel('USED', 'LOCAL')).toBe('Occasion importée')
    expect(supplyRubriqueLabel('REFURBISHED', 'LOCAL')).toBe('Ré-usiné')
  })
})

describe('poids annoncé contre famille mal choisie', () => {
  // « Capteur de position VILEBREQUIN » se rattache aux pièces moteur lourdes
  // (12–45 kg, 25–80 dm³) à cause du mot « vilebrequin ». La source annonce
  // 200 g : c'est elle qui fait foi.
  const capteur: ImportQuoteItem = {
    name: 'Capteur de position vilebrequin',
    category: 'Capteurs & calculateurs / Capteur vilebrequin',
    weightKg: 0.2,
    quantity: 1,
    customsValue: 34_800,
  }

  it("n'offre pas un conteneur maritime pour un capteur de 200 g", () => {
    const q = computeImportQuote([capteur], 'SEA_LCL')
    expect(q.available).toBe(false)
  })

  it('facture le minimum de perception aérien, pas un volume de pièce moteur', () => {
    const q = computeImportQuote([capteur], 'AIR_ECONOMY')
    expect(q.freightFee).toBe(LOGISTICS_MODES.AIR_ECONOMY.minimumCharge)
    expect(q.chargeableWeightKg).toBeLessThan(1)
  })

  it('ne descend jamais sous la densité du métal plein', () => {
    const lourd: ImportQuoteItem = { ...capteur, weightKg: 40 }
    const q = computeImportQuote([lourd], 'SEA_LCL')
    expect(q.chargeableWeightKg).toBeGreaterThanOrEqual(20)
  })

  it("garde la borne haute de la famille quand la source ne donne aucun poids", () => {
    const sansPoids = computeImportQuote([{ ...capteur, weightKg: null }], 'SEA_LCL')
    expect(sansPoids.available).toBe(true)
  })

  it('laisse intact le chiffrage d’une pièce bien rattachée', () => {
    // Turbo 6,4 kg dans la famille TURBO (5–12 kg) : le poids domine déjà.
    const turbo: ImportQuoteItem = {
      name: 'Turbocompresseur Garrett GT1749V',
      category: 'Admission & turbo / Turbocompresseur',
      weightKg: 6.4,
      quantity: 1,
      customsValue: 252_543,
    }
    expect(computeImportQuote([turbo], 'AIR_ECONOMY').chargeableWeightKg).toBe(6.4)
    expect(computeImportQuote([turbo], 'SEA_LCL').available).toBe(true)
  })
})

describe('divers', () => {
  it('parseImportFreightMode retombe sur l’aérien économique', () => {
    expect(parseImportFreightMode('SEA_LCL')).toBe('SEA_LCL')
    expect(parseImportFreightMode('AIR_STANDARD')).toBe('AIR_ECONOMY')
    expect(parseImportFreightMode(null)).toBe('AIR_ECONOMY')
  })

  it('originCountryLabel traduit les pays connus', () => {
    expect(originCountryLabel('DE')).toBe('Allemagne')
    expect(originCountryLabel('jp')).toBe('Japon')
    expect(originCountryLabel('ZZ')).toBe('ZZ')
    expect(originCountryLabel(null)).toBeNull()
  })
})
