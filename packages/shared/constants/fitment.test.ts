import { describe, it, expect } from 'vitest'
import { parseCompatibilityText } from './fitment'

describe('parseCompatibilityText', () => {
  it('parse "Marque Modèle AAAA-AAAA" (cas seed)', () => {
    expect(parseCompatibilityText('Toyota Corolla 2010-2020')).toEqual({
      brand: 'Toyota',
      model: 'Corolla',
      yearFrom: 2010,
      yearTo: 2020,
    })
  })

  it('parse les modèles multi-mots', () => {
    expect(parseCompatibilityText('Toyota Land Cruiser 2016-2023')).toEqual({
      brand: 'Toyota',
      model: 'Land Cruiser',
      yearFrom: 2016,
      yearTo: 2023,
    })
  })

  it('gère une année unique (pas de borne haute)', () => {
    const r = parseCompatibilityText('Peugeot 308 2014')
    expect(r).toMatchObject({ brand: 'Peugeot', model: '308', yearFrom: 2014, yearTo: null })
  })

  it('gère une plage ouverte (présent / ...)', () => {
    expect(parseCompatibilityText('Hyundai Tucson 2016-présent')).toMatchObject({
      brand: 'Hyundai',
      model: 'Tucson',
      yearFrom: 2016,
      yearTo: null,
    })
  })

  it('fallback : marque inconnue → premier mot', () => {
    const r = parseCompatibilityText('Mercedes Sprinter 2014-2020')
    expect(r?.model).toBe('Sprinter')
    expect(r?.yearFrom).toBe(2014)
    expect(r?.yearTo).toBe(2020)
    expect(r?.brand.length).toBeGreaterThan(0)
  })

  it('retourne null sur entrée vide ou nulle', () => {
    expect(parseCompatibilityText('')).toBeNull()
    expect(parseCompatibilityText(null)).toBeNull()
    expect(parseCompatibilityText('   ')).toBeNull()
  })

  it('garde le premier véhicule sur une liste séparée par virgule', () => {
    const r = parseCompatibilityText('Toyota Corolla 2010-2020, Toyota Auris 2012-2018')
    expect(r).toMatchObject({ brand: 'Toyota', model: 'Corolla', yearFrom: 2010, yearTo: 2020 })
  })
})
