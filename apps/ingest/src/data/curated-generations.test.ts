import { describe, it, expect } from 'vitest'
import {
  CURATED_GENERATIONS,
  curatedGenerationsFor,
  curatedVariantLabel,
  engineFamily,
  matchVariant,
  parseEngineLabel,
  resolveCuratedRange,
} from './curated-generations.ts'

const w205 = curatedGenerationsFor('MERCEDES-BENZ', 'Classe C')
const clio = curatedGenerationsFor('RENAULT', 'Clio')

describe('référentiel curé', () => {
  it('charge et valide tous les fichiers du dossier', () => {
    expect(CURATED_GENERATIONS.length).toBeGreaterThan(10)
  })

  it('cite une source par génération et garde les variantes dans sa fenêtre', () => {
    for (const g of CURATED_GENERATIONS) {
      expect(g.source).toMatch(/^https?:\/\//)
      expect(g.variants.length).toBeGreaterThan(0)
      expect(g.from).toBeLessThanOrEqual(g.to)
      for (const v of g.variants) {
        expect(v.from).toBeLessThanOrEqual(v.to)
        expect(v.powerCv).toBeGreaterThan(20)
        expect(v.powerCv).toBeLessThan(1000)
      }
    }
  })

  it('retrouve un modèle quelle que soit la casse', () => {
    expect(curatedGenerationsFor('mercedes-benz', 'classe c').length).toBeGreaterThan(0)
  })
})

describe('parseEngineLabel', () => {
  it('reconnaît le diesel à sa famille de bloc', () => {
    expect(parseEngineLabel('1.5 dCi 90 cv').fuel).toBe('DIESEL')
    expect(parseEngineLabel('220 CDi 2.1 170 cv').fuel).toBe('DIESEL')
    // « BlueHDi » n'offre pas de frontière de mot avant « HDi ».
    expect(parseEngineLabel('1.5 BlueHDi 102 cv').fuel).toBe('DIESEL')
    expect(parseEngineLabel('3.0 TD 4WD 131 cv').fuel).toBe('DIESEL')
  })

  it('reconnaît l’essence à ses marqueurs', () => {
    expect(parseEngineLabel('1.6 VVT-i 110 cv').fuel).toBe('PETROL')
    expect(parseEngineLabel('180 1.6 i 156 cv').fuel).toBe('PETROL')
  })

  it('laisse le carburant inconnu quand rien ne le trahit', () => {
    // Un code moteur seul ne dit pas le carburant : présumer l'essence
    // écarterait à tort une variante diesel curée.
    expect(parseEngineLabel('2.8 4M40 94 cv').fuel).toBeNull()
  })
})

describe('engineFamily', () => {
  it.each([
    ['180 Kompressor 1.6 i 156 cv', 'KOMPRESSOR'],
    ['180 CGI 1.6 156 cv', 'CGI'],
    ['300 2.0 i EQ BOOST 258 cv', 'EQ_BOOST'],
    ['300 e 2.0 i 320 EQ Power 211 cv', 'EQ_POWER'],
    ['180 1.6 i 156 cv', 'DIRECT'],
  ])('%s → %s', (label, family) => {
    expect(engineFamily(label)).toBe(family)
  })
})

describe('matchVariant', () => {
  const w205gen = w205[0]
  if (!w205gen) throw new Error('W205 absent du référentiel curé')

  it('distingue le C 300 essence du C 300 d de même puissance', () => {
    expect(matchVariant(w205gen, '300 2.0 i 245 cv')?.name).toBe('C 300')
    expect(matchVariant(w205gen, '300 CDi 2.0 245 cv')?.name).toBe('C 300 d')
  })

  it('distingue les deux C 180 par la cylindrée', () => {
    expect(matchVariant(w205gen, '180 1.6 i 156 cv')?.from).toBe(2014)
    expect(matchVariant(w205gen, '180 1.5 i 156 cv')?.from).toBe(2018)
  })

  it('refuse les blocs d’une génération antérieure', () => {
    expect(matchVariant(w205gen, '180 Kompressor 1.6 i 156 cv')).toBeNull()
    expect(matchVariant(w205gen, '180 CGI 1.6 156 cv')).toBeNull()
  })

  it('refuse un badge EQ Boost sur une variante de phase 1', () => {
    expect(matchVariant(w205gen, '200 2.0 i EQ Boost 184 cv')).toBeNull()
  })
})

describe('curatedVariantLabel', () => {
  it('écrit une variante dans la même forme que les libellés de la source', () => {
    const clioGen = clio.find((g) => g.code === 'X98')
    const dci90 = clioGen?.variants.find((v) => v.powerCv === 90 && v.fuel === 'DIESEL')
    expect(dci90 && curatedVariantLabel(dci90)).toBe('1.5 dCi 90 cv')
  })

  it('place le suffixe de désignation avant la cylindrée', () => {
    const v = w205[0]?.variants.find((x) => x.num === 220 && x.powerCv === 170)
    expect(v && curatedVariantLabel({ ...v, tech: ['CDi'] })).toBe('220 CDi 2.1 170 cv')
  })
})

describe('resolveCuratedRange', () => {
  it('sans génération curée, garde la plage relevée', () => {
    expect(resolveCuratedRange([], 'peu importe', [2011, 2015], 1980, 2026)).toEqual([2011, 2015])
  })

  it('impose les années curées quand la source se trompe de phase', () => {
    expect(resolveCuratedRange(w205, '180 1.5 i 156 cv', [2014, 2021], 1980, 2026)).toEqual([2018, 2021])
  })

  it('laisse la source étendre la plage hors des fenêtres curées', () => {
    expect(resolveCuratedRange(w205, '180 1.6 i 156 cv', [2011, 2021], 1980, 2026)).toEqual([2011, 2021])
  })

  it('exclut des fenêtres curées une motorisation qui n’y figure pas', () => {
    expect(resolveCuratedRange(w205, '200 CDi 2.2 136 cv', [1980, 2026], 1980, 2026)).toEqual([1980, 2013])
  })

  it('unit les fenêtres quand la motorisation traverse deux générations', () => {
    // Le 1.5 dCi 75 ch équipe le Logan I (2004-2012) et le Logan II (2012-2020).
    const logan = curatedGenerationsFor('RENAULT', 'Logan')
    const range = resolveCuratedRange(logan, '1.5 dCi 75 cv', null, 1995, 2026)
    expect(range?.[0]).toBeLessThanOrEqual(2004)
    expect(range?.[1]).toBeGreaterThanOrEqual(2020)
  })

  it('retranche les fenêtres curées et garde le plus long intervalle restant', () => {
    // Bloc inconnu de toutes les générations Clio curées (1998-2026) : il ne
    // peut subsister que sur les millésimes antérieurs.
    const range = resolveCuratedRange(clio, '3.0 i V6 24V 255 cv', [1995, 2026], 1995, 2026)
    expect(range).toEqual([1995, 1997])
  })
})
