import { describe, it, expect } from 'vitest'
import { buildSpellingMap, canonicalEngineLabel, parseEngineParts, spellingKey } from './engine-label.ts'

const canon = (label: string, spelling?: Map<string, string>) =>
  canonicalEngineLabel(parseEngineParts(label), spelling)

describe('parseEngineParts', () => {
  it('sépare la désignation, la cylindrée, le bloc et la puissance', () => {
    expect(parseEngineParts('220 CDi 2.1 CDi 16V 7G-TRONIC BlueTEC 163 cv Boîte auto')).toEqual({
      num: 220,
      displacement: 2.1,
      prefix: ['CDi'],
      tech: [],
      drive: null,
      powerCv: 163,
    })
  })

  it('garde la transmission, qui change les pièces', () => {
    expect(parseEngineParts('2.4 D-4D 16V DPF Pickup Double Cabine AWD 150cv Boîte auto').drive).toBe('4WD')
    expect(parseEngineParts('1.6 CRDi 16V 2WD S&S 116 c v').drive).toBe('2WD')
  })

  it('garde la puissance cumulée d’un hybride', () => {
    expect(parseEngineParts('1.6 TGDi 16V 230 Hybrid 2WD 179 cv Boite auto').tech).toEqual([
      'TGDi',
      '230',
      'Hybrid',
    ])
  })
})

describe('canonicalEngineLabel', () => {
  it.each([
    // Puissance : toutes les graphies de la source ramènent au même libellé.
    ['1.2 THP Puretech 12V 130 c v', '1.2 THP Puretech 130 cv'],
    ['1.2 THP Puretech 12V GPF EAT8 S&S 130 cv Boite auto', '1.2 THP Puretech 130 cv'],
    ['1.2 THP Puretech 12V 130CV', '1.2 THP Puretech 130 cv'],
    // Nombre coupé en deux par la source.
    ['1.6 i 1 02 c v', '1.6 i 102 cv'],
    // Cylindrée collée à la lettre du bloc, et désignation à zéro de tête.
    ['0.8i 52CV BOITE AUTO', '0.8 i 52 cv'],
    ['08 i 52cv', '8 i 52 cv'],
    // Puissance annoncée en kW/ch entre parenthèses.
    ['2.4 D (GUN135) (125 KW/ 170 CH )', '2.4 D 170 cv'],
    ['1.2 MPI (61 KW / 83 HP)', '1.2 MPI 83 cv'],
    // « 4×4 » et « 4x4 ».
    ['2.5 D 4×4 Pickup double Cabine 75cv Véhicule commercial', '2.5 D 4WD 75 cv'],
    // Le bloc répété par la désignation n'apparaît qu'une fois, avant la cylindrée.
    ['180 CDi 1.6 CDi 16V 9G-TRONIC BlueTEC 122cv Boîte auto', '180 CDi 1.6 122 cv'],
    // Boîte, dépollution, soupapes et carrosserie disparaissent.
    ['63 S AMG 4.0 i V8 32V 7G-SPEEDSHIFT 510 cv Boîte auto', '63 S AMG 4.0 i V8 510 cv'],
  ])('%s → %s', (raw, expected) => {
    expect(canon(raw)).toBe(expected)
  })

  it('ne fusionne pas deux blocs différents de même cylindrée et puissance', () => {
    // Kompressor (W203), CGI (W204) et injection directe (W205) coexistent.
    expect(canon('180 Kompressor 1.6 i 16V 156 cv')).not.toBe(canon('180 1.6 i 16V 156 cv'))
    expect(canon('180 CGI 1.6 16V CGI 156 cv')).not.toBe(canon('180 1.6 i 16V 156 cv'))
  })

  it('ne fusionne pas deux transmissions différentes', () => {
    expect(canon('2.4 D-4D 16V AWD 150cv')).not.toBe(canon('2.4 D-4D 16V RWD 150cv'))
  })

  it('laisse le libellé d’origine quand il n’y a ni cylindrée ni puissance', () => {
    expect(canon('Boite auto')).toBeNull()
  })

  /**
   * Le script d'annotation relit le fichier qu'il a écrit : un libellé déjà
   * canonique doit se relire à l'identique, sinon l'appariement avec la source
   * se défait à la passe suivante.
   */
  it('est idempotent', () => {
    const labels = [
      '1.2 THP Puretech 12V GPF EAT8 S&S 130 c v Boite auto',
      '1.6 i 1 02 c v',
      '1.0 12V 61 cv',
      '1.0L L4 12V 61cv',
      '08 i 52cv',
      '0.8i 52CV',
      '2.5 D 4×4 Pickup double Cabine 75cv Véhicule commercial',
      '1.6 Blue HDi FAP 4×4 S&S 99 cv',
      '300 h 2.1 CDi 16V 231 Hybrid 7G-TRONIC 204 cv Boîte auto',
      '1.2 Puretech 12V 83CV',
      '2.4 D (GUN135) (125 KW/ 170 CH )',
    ]
    for (const label of labels) {
      const once = canon(label) ?? label
      expect(canon(once) ?? once).toBe(once)
    }
  })
})

describe('buildSpellingMap', () => {
  it('retient la graphie la plus fréquente du corpus', () => {
    const map = buildSpellingMap(['1.4 T-Jet 120 cv', '1.4 T-Jet 120 cv', '1.4 T-jet 16V 120 cv'])
    expect(map.get(spellingKey('T-jet'))).toBe('T-Jet')
  })

  it('unifie les variantes de ponctuation', () => {
    // « VVTi » et « VVT-i » désignent la même distribution.
    const map = buildSpellingMap(['1.6 VVT-i 110 cv', '1.6 VVT-i 110 cv', '1.6 VVTi 110 cv'])
    expect(map.get(spellingKey('VVTi'))).toBe('VVT-i')
  })

  it('à fréquence égale, préfère la graphie la plus capitalisée', () => {
    const map = buildSpellingMap(['2.4 D-4D 150 cv', '2.4 d-4d 150 cv'])
    expect(map.get(spellingKey('d-4d'))).toBe('D-4D')
  })
})
