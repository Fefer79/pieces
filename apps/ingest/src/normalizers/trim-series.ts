import { parseSeries } from './global-auto.ts'

/**
 * Rattachement motorisation ↔ génération, à partir des lignes de compatibilité
 * Global Auto (`vehicle_compatibility`).
 *
 * Deux défauts de la source rendent le rattachement naïf faux :
 *
 *  1. Une même motorisation (`trim_id`) apparaît sous PLUSIEURS générations —
 *     1 474 sur 5 788 au relevé du 2026-09-13. Prendre la première vue (ce que
 *     faisait l'ingest) l'épingle au hasard des pages produits.
 *  2. Certaines générations servent de fourre-tout : une seule fiche produit y
 *     déclare toutes les motorisations du modèle. La Classe C (202) Berline
 *     (1993-2000) porte ainsi les 386 motorisations du modèle, dont des
 *     hybrides 2018 — d'où un sélecteur qui proposait tout à toutes les années.
 *
 * On écarte donc les générations fourre-tout, puis on retient l'union des
 * millésimes des générations restantes.
 */

export interface CompatPair {
  modelId: number
  seriesId: number
  seriesName: string
  trimId: number
  trimName: string
}

export interface YearRange {
  from: number
  to: number | null
}

/**
 * Part des motorisations du modèle qu'une génération doit couvrir pour être
 * tenue pour un fourre-tout. 80 % : la plus large génération légitime observée
 * (Peugeot 308 SW) plafonne à 55 % de son modèle.
 */
const CATCH_ALL_SHARE = 0.8
/** En deçà, un modèle a trop peu de motorisations pour que la part fasse sens. */
const CATCH_ALL_MIN_TRIMS = 10

/**
 * Générations fourre-tout : couvrent presque tout le modèle alors que d'autres
 * générations du même modèle portent, elles, des motorisations distinctes.
 */
export function findCatchAllSeries(pairs: CompatPair[]): Set<number> {
  const trimsByModel = new Map<number, Set<number>>()
  const trimsBySeries = new Map<number, Set<number>>()
  const modelOfSeries = new Map<number, number>()

  for (const p of pairs) {
    const modelTrims = trimsByModel.get(p.modelId) ?? new Set<number>()
    modelTrims.add(p.trimId)
    trimsByModel.set(p.modelId, modelTrims)
    const seriesTrims = trimsBySeries.get(p.seriesId) ?? new Set<number>()
    seriesTrims.add(p.trimId)
    trimsBySeries.set(p.seriesId, seriesTrims)
    modelOfSeries.set(p.seriesId, p.modelId)
  }

  const seriesCountByModel = new Map<number, number>()
  for (const seriesId of trimsBySeries.keys()) {
    const modelId = modelOfSeries.get(seriesId)
    if (modelId === undefined) continue
    seriesCountByModel.set(modelId, (seriesCountByModel.get(modelId) ?? 0) + 1)
  }

  const catchAll = new Set<number>()
  for (const [seriesId, trims] of trimsBySeries) {
    const modelId = modelOfSeries.get(seriesId)
    if (modelId === undefined) continue
    const modelTrims = trimsByModel.get(modelId)?.size ?? 0
    if (modelTrims < CATCH_ALL_MIN_TRIMS) continue
    if ((seriesCountByModel.get(modelId) ?? 0) < 2) continue
    if (trims.size / modelTrims >= CATCH_ALL_SHARE) catchAll.add(seriesId)
  }
  return catchAll
}

/** Plage d'une génération, lue dans son libellé (« (03/2014 - 04/2021) »). */
function seriesRange(name: string | null | undefined): YearRange | null {
  if (!name) return null
  const { yearStart, yearEnd } = parseSeries(name)
  return yearStart === null ? null : { from: yearStart, to: yearEnd }
}

/**
 * Plage d'années de chaque motorisation : union des générations qui la portent,
 * fourre-tout exclus. Une motorisation dont toutes les générations sont
 * fourre-tout (ou sans millésime lisible) est absente du résultat — l'appelant
 * la traitera comme « plage inconnue » plutôt que d'inventer une borne.
 */
export function resolveTrimYearRanges(pairs: CompatPair[]): Map<number, YearRange> {
  const catchAll = findCatchAllSeries(pairs)
  const out = new Map<number, YearRange>()

  for (const p of pairs) {
    if (catchAll.has(p.seriesId)) continue
    const range = seriesRange(p.seriesName)
    if (!range) continue
    const cur = out.get(p.trimId)
    if (!cur) {
      out.set(p.trimId, { ...range })
      continue
    }
    cur.from = Math.min(cur.from, range.from)
    // `null` = encore produite : absorbe toute borne haute.
    cur.to = cur.to === null || range.to === null ? null : Math.max(cur.to, range.to)
  }
  return out
}

/**
 * Génération à retenir pour une motorisation quand le modèle de données n'en
 * accepte qu'une (table `vehicle_engines`) : la plus étroite hors fourre-tout,
 * à défaut la première vue. Une plage étroite est la plus informative et la
 * moins risquée — elle n'étale pas la motorisation sur trente ans.
 */
export function pickTrimSeries(pairs: CompatPair[]): Map<number, number> {
  const catchAll = findCatchAllSeries(pairs)
  const best = new Map<number, { seriesId: number; span: number }>()

  for (const p of pairs) {
    const penalty = catchAll.has(p.seriesId) ? 10_000 : 0
    const range = seriesRange(p.seriesName)
    // Sans millésime lisible, on ne peut pas juger l'étroitesse : rang médiocre.
    const span = range ? (range.to ?? new Date().getFullYear()) - range.from : 1_000
    const score = span + penalty
    const cur = best.get(p.trimId)
    if (!cur || score < cur.span) best.set(p.trimId, { seriesId: p.seriesId, span: score })
  }
  return new Map([...best].map(([trimId, v]) => [trimId, v.seriesId]))
}
