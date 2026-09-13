import { describe, it, expect } from 'vitest'
import { findCatchAllSeries, resolveTrimYearRanges, pickTrimSeries, type CompatPair } from './trim-series.ts'

/** Fabrique des paires (modèle, génération, motorisation) façon Global Auto. */
function pairs(
  spec: { seriesId: number; seriesName: string; trims: number[] }[],
  modelId = 1,
): CompatPair[] {
  return spec.flatMap((s) =>
    s.trims.map((trimId) => ({
      modelId,
      seriesId: s.seriesId,
      seriesName: s.seriesName,
      trimId,
      trimName: `moteur ${trimId}`,
    })),
  )
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('findCatchAllSeries', () => {
  it('repère la génération qui porte (presque) toutes les motorisations du modèle', () => {
    const p = pairs([
      { seriesId: 729, seriesName: '(202) Berline (03/1993 - 03/2000)', trims: range(20) },
      { seriesId: 423, seriesName: '(205) Berline (03/2014 - 04/2021)', trims: [15, 16, 17] },
      { seriesId: 409, seriesName: '(203) berline (04/2000 - 12/2003)', trims: [1, 2, 3] },
    ])
    expect([...findCatchAllSeries(p)]).toEqual([729])
  })

  it('épargne une génération large quand elle reste sous le seuil', () => {
    const p = pairs([
      { seriesId: 1, seriesName: 'A (01/2000 - 01/2010)', trims: range(10) },
      { seriesId: 2, seriesName: 'B (01/2010 - 01/2020)', trims: range(20).slice(10) },
    ])
    expect(findCatchAllSeries(p).size).toBe(0)
  })

  it('ne juge pas un modèle à une seule génération', () => {
    const p = pairs([{ seriesId: 1, seriesName: 'A (01/2000 - 01/2010)', trims: range(30) }])
    expect(findCatchAllSeries(p).size).toBe(0)
  })

  it('ne juge pas un modèle à trop peu de motorisations', () => {
    const p = pairs([
      { seriesId: 1, seriesName: 'A (01/2000 - 01/2010)', trims: [1, 2, 3, 4] },
      { seriesId: 2, seriesName: 'B (01/2010 - 01/2020)', trims: [1] },
    ])
    expect(findCatchAllSeries(p).size).toBe(0)
  })
})

describe('resolveTrimYearRanges', () => {
  const p = pairs([
    // Fourre-tout : la Classe C (202) porte toutes les motorisations du modèle.
    { seriesId: 729, seriesName: '(202) Berline (03/1993 - 03/2000)', trims: range(20) },
    { seriesId: 423, seriesName: '(205) Berline (03/2014 - 04/2021)', trims: [15] },
    { seriesId: 432, seriesName: '(206) Berline (04/2021 - ...)', trims: [15, 16] },
    { seriesId: 409, seriesName: '(203) berline (04/2000 - 12/2003)', trims: [1] },
  ])
  const ranges = resolveTrimYearRanges(p)

  it('ignore la génération fourre-tout', () => {
    // Sans l'exclusion, le moteur 1 commencerait en 1993.
    expect(ranges.get(1)).toEqual({ from: 2000, to: 2003 })
  })

  it('unit les générations légitimes d’une motorisation reconduite', () => {
    expect(ranges.get(15)).toEqual({ from: 2014, to: null })
  })

  it('laisse sans plage une motorisation seulement vue en fourre-tout', () => {
    expect(ranges.has(2)).toBe(false)
  })
})

describe('pickTrimSeries', () => {
  it('retient la génération la plus étroite plutôt que la première vue', () => {
    const p = pairs([
      { seriesId: 729, seriesName: '(202) Berline (03/1993 - 03/2000)', trims: range(20) },
      { seriesId: 423, seriesName: '(205) Berline (03/2014 - 04/2021)', trims: [15] },
      { seriesId: 411, seriesName: '(205) Break (10/2014 - 04/2021)', trims: [15] },
      { seriesId: 409, seriesName: '(203) berline (04/2000 - 12/2003)', trims: [1] },
    ])
    expect(pickTrimSeries(p).get(15)).toBe(423)
    expect(pickTrimSeries(p).get(1)).toBe(409)
  })

  it('retombe sur le fourre-tout quand c’est la seule génération connue', () => {
    const p = pairs([
      { seriesId: 729, seriesName: '(202) Berline (03/1993 - 03/2000)', trims: range(20) },
      { seriesId: 423, seriesName: '(205) Berline (03/2014 - 04/2021)', trims: [15] },
    ])
    expect(pickTrimSeries(p).get(3)).toBe(729)
  })
})
