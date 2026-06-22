import { describe, it, expect } from 'vitest'
import { parseCompatibilityText, extractFitmentsFromName } from './fitment'

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

describe('extractFitmentsFromName', () => {
  it('détecte la marque noyée dans le titre (marque seule)', () => {
    expect(extractFitmentsFromName('Phare BMW')).toEqual([
      { brand: 'BMW', model: null, yearFrom: null, yearTo: null },
    ])
    expect(extractFitmentsFromName('Filtre à huile Renault')).toEqual([
      { brand: 'RENAULT', model: null, yearFrom: null, yearTo: null },
    ])
  })

  it('reconnaît un modèle connu du catalogue, ignore les codes inconnus', () => {
    expect(extractFitmentsFromName('Disque Hyundai Tucson')).toEqual([
      { brand: 'HYUNDAI', model: 'Tucson', yearFrom: null, yearTo: null },
    ])
    // « E46 » n'est pas un modèle du catalogue → marque seule.
    expect(extractFitmentsFromName('Moteur BMW E46')).toEqual([
      { brand: 'BMW', model: null, yearFrom: null, yearTo: null },
    ])
  })

  it('gère les alias et fautes de frappe (Mercedes / Range Rover / Huyndai)', () => {
    expect(extractFitmentsFromName('Calandre Mercedes C200')[0]?.brand).toBe('MERCEDES-BENZ')
    expect(extractFitmentsFromName('Pompe Mercedes Benz C 2003')[0]?.brand).toBe('MERCEDES-BENZ')
    expect(extractFitmentsFromName('Jantes Range Rover / 19 pouces')[0]?.brand).toBe('LAND ROVER')
    expect(extractFitmentsFromName('Phare Huyndai Santa Fe')[0]?.brand).toBe('HYUNDAI')
  })

  it('extrait plusieurs marques quand le titre en mentionne plusieurs', () => {
    expect(extractFitmentsFromName('Moteur Hyundai Kia').map((f) => f.brand)).toEqual(['HYUNDAI', 'KIA'])
  })

  it('ne crée aucun fitment pour un titre générique', () => {
    expect(extractFitmentsFromName('Batterie de voiture')).toEqual([])
    expect(extractFitmentsFromName('Pneus 195 65 R15')).toEqual([])
    expect(extractFitmentsFromName('')).toEqual([])
    expect(extractFitmentsFromName(null)).toEqual([])
  })

  it('n’ignore pas la casse ni les accents', () => {
    expect(extractFitmentsFromName('phare hyundaï')).toEqual([
      { brand: 'HYUNDAI', model: null, yearFrom: null, yearTo: null },
    ])
  })
})
