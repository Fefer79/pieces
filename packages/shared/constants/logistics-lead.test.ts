import { describe, it, expect } from 'vitest'
import {
  computeCertainty,
  nextBestSignal,
  certaintyLevelSpec,
  CERTAINTY_WEIGHTS,
} from './logistics-lead'

describe('computeCertainty', () => {
  it('renvoie 0 / LOW sans aucun signal', () => {
    expect(computeCertainty({})).toEqual({ score: 0, level: 'LOW' })
  })

  it('prend le maximum entre VIN et saisie manuelle, jamais la somme', () => {
    const vinOnly = computeCertainty({ vin: true })
    const manualOnly = computeCertainty({ vehicleManual: true })
    const both = computeCertainty({ vin: true, vehicleManual: true })

    expect(vinOnly.score).toBe(CERTAINTY_WEIGHTS.vin)
    expect(manualOnly.score).toBe(CERTAINTY_WEIGHTS.vehicleManual)
    expect(both.score).toBe(CERTAINTY_WEIGHTS.vin)
  })

  it('additionne la carte grise au VIN (elle prouve que le VIN est celui du véhicule)', () => {
    const { score } = computeCertainty({ vin: true, registrationPhoto: true })
    expect(score).toBe(CERTAINTY_WEIGHTS.vin + CERTAINTY_WEIGHTS.registrationPhoto)
  })

  it('classe LOW / MEDIUM / HIGH sur les bons seuils', () => {
    expect(computeCertainty({ partName: true }).level).toBe('LOW') // 10
    expect(computeCertainty({ vin: true, partName: true }).level).toBe('MEDIUM') // 40
    expect(
      computeCertainty({ vin: true, partName: true, oemReference: true, partPhoto: true }).level,
    ).toBe('HIGH') // 75
  })

  it('plafonne à 100 quand tout est renseigné', () => {
    const { score, level } = computeCertainty({
      vin: true,
      vehicleManual: true,
      registrationPhoto: true,
      oemReference: true,
      partPhoto: true,
      partName: true,
      partCategory: true,
      energyType: true,
    })
    expect(score).toBe(100)
    expect(level).toBe('HIGH')
  })
})

describe('nextBestSignal', () => {
  it('propose le VIN en premier quand rien n\'est renseigné', () => {
    const next = nextBestSignal({})
    expect(next?.signal).toBe('vin')
    expect(next?.gain).toBe(30)
  })

  it('n\'annonce aucun gain pour la saisie manuelle quand le VIN est déjà là', () => {
    const next = nextBestSignal({ vin: true })
    expect(next?.signal).not.toBe('vehicleManual')
  })

  it('renvoie null quand plus rien n\'apporte de points', () => {
    expect(
      nextBestSignal({
        vin: true,
        vehicleManual: true,
        registrationPhoto: true,
        oemReference: true,
        partPhoto: true,
        partName: true,
        partCategory: true,
        energyType: true,
      }),
    ).toBeNull()
  })
})

describe('certaintyLevelSpec', () => {
  it('retombe sur LOW pour un niveau inconnu', () => {
    expect(certaintyLevelSpec('HIGH').tone).toBe('ok')
    expect(certaintyLevelSpec('LOW').tone).toBe('warn')
  })
})
