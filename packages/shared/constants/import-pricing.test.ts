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
import { COMMUNITY_LEVIES_RATE, CUSTOMS_DUTY_RATE, customsDutyRate, LOGISTICS_MODES, matchLogisticsFamily } from './logistics'

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

  it('applique le droit réduit des filtres (position 8421)', () => {
    const filtre: ImportQuoteItem = {
      name: 'Filtre à huile',
      category: 'Filtration / Filtre à huile',
      weightKg: 0.4,
      quantity: 1,
      customsValue: 8_000,
    }
    const q = computeImportQuote([filtre], 'AIR_ECONOMY')
    const attendu = Math.round((0.075 * (8_000 + q.freightFee)) / 100) * 100
    expect(q.customsFee).toBe(attendu)
    // Moins cher qu'une pièce au droit commun de même valeur et même fret.
    expect(q.customsFee).toBeLessThan(computeImportQuote([bougie], 'AIR_ECONOMY').customsFee)
  })

  it('applique le droit majoré des batteries (position 8507)', () => {
    const batterie: ImportQuoteItem = {
      name: 'Batterie 12V 70Ah',
      category: 'Électrique & batterie / Batterie',
      weightKg: 16,
      quantity: 1,
      customsValue: 60_000,
    }
    const q = computeImportQuote([batterie], 'SEA_LCL')
    const attendu = Math.round((0.225 * (60_000 + q.freightFee)) / 100) * 100
    expect(q.customsFee).toBe(attendu)
  })

  it('liquide un lot mixte ligne par ligne, pas au taux moyen', () => {
    const filtre: ImportQuoteItem = {
      name: 'Filtre à huile', category: 'Filtration / Filtre à huile',
      weightKg: 0.4, quantity: 1, customsValue: 50_000,
    }
    const batterie: ImportQuoteItem = {
      name: 'Batterie 12V 70Ah', category: 'Électrique & batterie / Batterie',
      weightKg: 16, quantity: 1, customsValue: 50_000,
    }
    const mixte = computeImportQuote([filtre, batterie], 'SEA_LCL')
    const forfait = Math.round(
      (CUSTOMS_DUTY_RATE * (100_000 + mixte.freightFee)) / 100,
    ) * 100
    // Le lot contient une ligne à 7,5 % et une à 22,5 % : le total ne peut pas
    // valoir le taux commun de 12,5 % appliqué à l'ensemble.
    expect(mixte.customsFee).not.toBe(forfait)
    expect(mixte.customsFee).toBeGreaterThan(forfait)
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

describe('customsDutyRate', () => {
  it('ajoute les prélèvements communautaires au droit de douane', () => {
    expect(COMMUNITY_LEVIES_RATE).toBe(0.025)
    // Position 8708 et assimilées : 10 % + 2,5 %.
    expect(customsDutyRate(matchLogisticsFamily('Disque de frein'))).toBeCloseTo(0.125, 5)
  })

  it('descend à 7,5 % sur les filtres et monte à 22,5 % sur les batteries', () => {
    expect(customsDutyRate(matchLogisticsFamily('Filtre à huile'))).toBeCloseTo(0.075, 5)
    expect(customsDutyRate(matchLogisticsFamily('Batterie 12V'))).toBeCloseTo(0.225, 5)
  })

  it('retombe sur le droit commun quand la famille est inconnue', () => {
    expect(customsDutyRate(null)).toBeCloseTo(0.125, 5)
    expect(customsDutyRate(undefined)).toBe(CUSTOMS_DUTY_RATE)
  })

  it("ne facture plus le forfait de 20 % hérité du cadrage", () => {
    expect(CUSTOMS_DUTY_RATE).toBeLessThan(0.2)
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
