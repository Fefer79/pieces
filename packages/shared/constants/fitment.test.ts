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

  it('reconnaît un modèle connu du catalogue', () => {
    expect(extractFitmentsFromName('Disque Hyundai Tucson')).toEqual([
      { brand: 'HYUNDAI', model: 'Tucson', yearFrom: null, yearTo: null },
    ])
  })

  it('résout les codes châssis BMW et les désignations Mercedes', () => {
    expect(extractFitmentsFromName('Moteur BMW E46')).toEqual([
      { brand: 'BMW', model: 'Serie 3', yearFrom: null, yearTo: null },
    ])
    expect(extractFitmentsFromName('Filtre à air Mercedes W203')[0]?.model).toBe('Classe C')
    expect(extractFitmentsFromName('Filtre à Huile Mercedes C Class Court')[0]?.model).toBe('Classe C')
    expect(extractFitmentsFromName('Volant Mercedes GLE')[0]?.model).toBe('Classe GLE')
  })

  it('ignore espaces, tirets et typos dans le nom de modèle', () => {
    // Le modèle DOIT être trouvé : un fitment marque seule matcherait tous les
    // modèles de la marque (une Ertiga verrait les pièces de Baleno).
    expect(extractFitmentsFromName('Filtre à air Suzuki S presso')[0]?.model).toBe('S-PRESSO')
    expect(extractFitmentsFromName('Filtre à huile Suzuki C Claz')[0]?.model).toBe('CIAZ')
    expect(extractFitmentsFromName('Filtre à Air Hyundai Santafe')[0]?.model).toBe('SANTA FE')
    expect(extractFitmentsFromName('Plaquettes avant Honda CRV 3')[0]?.model).toBe('CR-V')
    expect(extractFitmentsFromName('Plaquettes Isuzu Dmax')[0]?.model).toBe('D-Max')
  })

  it('capture le mot qui suit la marque quand le modèle est inconnu', () => {
    // « Obama » ne figure à aucun référentiel, mais désigne un véhicule précis :
    // mieux vaut un fitment trop étroit qu'une pollution de tous les Toyota.
    expect(extractFitmentsFromName('Filtre à air Toyota Obama 2kD')).toEqual([
      { brand: 'TOYOTA', model: 'OBAMA', yearFrom: null, yearTo: null },
    ])
  })

  it('ne devine aucun modèle sur un titre multi-marques', () => {
    // « BAIC » et « SAMSUNG » suivent une marque mais n'en sont pas un modèle :
    // sur une pièce annoncée pour cinq marques, le repli est désactivé.
    expect(
      extractFitmentsFromName("Bougie D'Allumage - TOYOTA / NISSAN / BAIC / RENAULT / SAMSUNG")
        .every((f) => f.model === null),
    ).toBe(true)
  })

  it('ne capture pas le vocabulaire pièce comme un modèle', () => {
    expect(extractFitmentsFromName('Filtre à Huile Peugeot Queue Courte')[0]?.model).toBeNull()
    expect(extractFitmentsFromName('Suzuki pièces détachées')[0]?.model).toBeNull()
    expect(extractFitmentsFromName('Jantes Toyota 15 pouces')[0]?.model).toBeNull()
    expect(extractFitmentsFromName('Filtre à Air Mercedes 5 Cylindres')[0]?.model).toBeNull()
  })

  it('extrait tous les modèles cités, pour chaque marque', () => {
    expect(
      extractFitmentsFromName('Filtre à huile Toyota 90915-YZZE1 compatible avec Corolla, Yaris, Camry et RAV4')
        .map((f) => f.model),
    ).toEqual(['Corolla', 'Yaris', 'Camry', 'Rav4'])
    expect(
      extractFitmentsFromName('FILTRE A AIR POUR FORD RANGER, MAZDA BT-50 ET TOYOTA FORTUNER')
        .map((f) => `${f.brand}/${f.model}`),
    ).toEqual(['FORD/Ranger', 'MAZDA/BT50', 'TOYOTA/Fortuner'])
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
