import { describe, it, expect } from 'vitest'
import { EUR_XOF_PARITY } from 'shared/constants'
import { normalizeOpistoPart, parseDetailSlug, resolveModel, IMPORT_MARGIN_PCT } from './opisto.ts'
import type { OpistoPartRaw } from '../sources/opisto.ts'

const raw = (over: Partial<OpistoPartRaw> = {}): OpistoPartRaw => ({
  productId: '88962594',
  partName: 'Alternateur',
  brand: 'PEUGEOT',
  vehicleLabel: 'PEUGEOT 208 1 PHASE 2 1.5 BLUE HDI - 16V TURBO Diesel 1499 cm3',
  priceEur: 28,
  url: 'https://www.opisto.fr/fr/auto/fiche-produit/88962594/alternateur-peugeot-208-1-2020',
  imageUrl: null,
  casseId: '4759',
  casseCountry: 'FR',
  warrantyMonths: 12,
  oemReference: '9820893880',
  ...over,
})

describe('parseDetailSlug', () => {
  it('reads model and donor year', () => {
    expect(parseDetailSlug('/x/alternateur-peugeot-208-1-2020', 'peugeot')).toEqual({
      modelSlug: '208-1',
      year: 2020,
    })
  })

  it('tolerates a slug without year', () => {
    expect(parseDetailSlug('/x/alternateur-peugeot-206', 'peugeot')).toEqual({
      modelSlug: '206',
      year: null,
    })
  })

  // « 2008 » et « 3008 » sont des modèles, pas des millésimes : on n'ampute pas
  // le modèle quand il ne resterait rien derrière.
  it('does not mistake a four-digit model for a year', () => {
    expect(parseDetailSlug('/x/turbo-peugeot-2008', 'peugeot')).toEqual({
      modelSlug: '2008',
      year: null,
    })
  })

  it('handles a multi-word model', () => {
    expect(parseDetailSlug('/x/compteur-mercedes-classe-c-4-2018', 'mercedes')).toEqual({
      modelSlug: 'classe-c-4',
      year: 2018,
    })
  })
})

describe('resolveModel', () => {
  // Opisto suffixe la génération (« 208-1 »), le référentiel Pièces ne connaît
  // que « 208 ».
  it('strips the generation suffix when the referential confirms it', () => {
    expect(resolveModel('PEUGEOT', '208-1')).toBe('208')
    expect(resolveModel('PEUGEOT', '308-2')).toBe('308')
  })

  it('keeps a model that already matches', () => {
    expect(resolveModel('PEUGEOT', '206')).toBe('206')
  })

  it('falls back to the de-slugified label for an unknown model', () => {
    expect(resolveModel('PEUGEOT', 'modele-inconnu')).toBe('Modele Inconnu')
  })

  it('uppercases an alphanumeric model code in the fallback', () => {
    expect(resolveModel('TOYOTA', 'mr2')).toBe('MR2')
    expect(resolveModel('TOYOTA', 'land-cruiser-90')).toBe('Land Cruiser 90')
  })

  it('returns null without a model', () => {
    expect(resolveModel('PEUGEOT', '')).toBeNull()
  })
})

describe('normalizeOpistoPart', () => {
  const ctx = { brandSlug: 'peugeot', categorySlug: 'alternateur' }

  it('keeps the purchase cost and derives the public price from the margin', () => {
    const item = normalizeOpistoPart(raw(), ctx)
    expect(item?.sourceCostAmount).toBe(28)
    expect(item?.sourceCostCurrency).toBe('EUR')
    expect(item?.sourceCostFcfa).toBe(Math.round(28 * EUR_XOF_PARITY))
    expect(item?.importMarginPct).toBe(IMPORT_MARGIN_PCT)
    expect(item?.price).toBe(
      Math.round((Math.round(28 * EUR_XOF_PARITY) * (1 + IMPORT_MARGIN_PCT / 100)) / 100) * 100,
    )
  })

  // Le prix affiché ne porte NI fret NI douane : ils sont chiffrés à la commande
  // et présentés en lignes séparées (DESIGN.md — aucune ligne cachée).
  it('excludes freight and customs from the listed price', () => {
    const item = normalizeOpistoPart(raw(), ctx)
    expect(item?.price).toBeLessThan(Math.round(28 * EUR_XOF_PARITY) * 3)
  })

  it('marks the part as used, OEM and to be imported', () => {
    const item = normalizeOpistoPart(raw(), ctx)
    expect(item?.originCountry).toBe('FR')
    expect(item?.warrantyValue).toBe(12)
    expect(item?.warrantyUnit).toBe('MONTH')
    expect(item?.category).toBe('Alternateur')
    expect(item?.oemReference).toBe('9820893880')
  })

  it('carries the breaker country through, rather than assuming France', () => {
    const item = normalizeOpistoPart(raw({ casseCountry: 'ES' }), ctx)
    expect(item?.originCountry).toBe('ES')
  })

  // Une pièce d'occasion vient d'un donneur précis : la compatibilité n'est pas
  // élargie à toute la génération.
  it('pins the fitment to the donor year', () => {
    const item = normalizeOpistoPart(raw(), ctx)
    expect(item?.fitments).toEqual([
      { brand: 'PEUGEOT', model: '208', yearFrom: 2020, yearTo: 2020 },
    ])
  })

  it('keeps the raw vehicle label for search', () => {
    expect(normalizeOpistoPart(raw(), ctx)?.vehicleCompatibility).toContain('BLUE HDI')
  })

  it('rejects a part without a price', () => {
    expect(normalizeOpistoPart(raw({ priceEur: 0 }), ctx)).toBeNull()
  })
})
