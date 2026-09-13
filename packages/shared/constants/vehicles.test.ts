import { describe, it, expect } from 'vitest'
import { getEngines, getEnginesForRange, VEHICLE_DATA } from './vehicles'

/**
 * Le référentiel date chaque motorisation : une génération ne partage pas les
 * moteurs des autres. Ces tests verrouillent le filtrage par millésime — la
 * régression corrigée ici était que TOUS les moteurs du modèle étaient
 * proposés, quelle que soit l'année.
 */
describe('getEngines', () => {
  const brand = 'TOYOTA'
  const model = 'Corolla'
  const entries = VEHICLE_DATA[brand]?.models[model]?.engines ?? []

  it('renvoie tous les moteurs du modèle sans année', () => {
    expect(getEngines(brand, model)).toHaveLength(entries.length)
  })

  it('restreint la liste au millésime demandé', () => {
    const all = getEngines(brand, model)
    const y2005 = getEngines(brand, model, 2005)
    expect(y2005.length).toBeGreaterThan(0)
    expect(y2005.length).toBeLessThan(all.length)
    expect(all).toEqual(expect.arrayContaining(y2005))
  })

  it('ne propose pas le même jeu de moteurs à 20 ans d’écart', () => {
    const early = getEngines(brand, model, 2000)
    const late = getEngines(brand, model, 2022)
    expect(early).not.toEqual(late)
  })

  it('ne renvoie que des moteurs dont la plage couvre l’année', () => {
    const year = 2010
    const labels = new Set(getEngines(brand, model, year))
    for (const e of entries) {
      if (typeof e === 'string') continue
      const [label, from, to] = e
      if (!labels.has(label)) continue
      expect(from).toBeLessThanOrEqual(year)
      expect(to ?? Number.POSITIVE_INFINITY).toBeGreaterThanOrEqual(year)
    }
  })

  it('retombe sur la liste complète si aucun moteur ne couvre l’année', () => {
    // Année hors de toute plage connue → menu vide inacceptable côté saisie.
    expect(getEngines(brand, model, 1900)).toEqual(getEngines(brand, model))
  })

  it('renvoie [] pour une marque ou un modèle inconnus', () => {
    expect(getEngines('INEXISTANT', 'X', 2010)).toEqual([])
    expect(getEngines(brand, 'Inexistant', 2010)).toEqual([])
  })
})

describe('getEnginesForRange', () => {
  const brand = 'TOYOTA'
  const model = 'Corolla'

  it('sans bornes, renvoie toute la liste', () => {
    expect(getEnginesForRange(brand, model)).toEqual(getEngines(brand, model))
  })

  it('couvre l’union des millésimes de l’intervalle', () => {
    const range = getEnginesForRange(brand, model, 2000, 2022)
    const y2000 = getEngines(brand, model, 2000)
    const y2022 = getEngines(brand, model, 2022)
    expect(range).toEqual(expect.arrayContaining(y2000))
    expect(range).toEqual(expect.arrayContaining(y2022))
  })

  it('une borne seule ouvre l’intervalle de l’autre côté', () => {
    const openEnd = getEnginesForRange(brand, model, 2015, null)
    const exact = getEngines(brand, model, 2015)
    expect(openEnd.length).toBeGreaterThanOrEqual(exact.length)
  })
})
