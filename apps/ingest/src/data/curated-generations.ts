/**
 * Générations curées à la main, là où la source Global Auto est trop lacunaire
 * pour dater les motorisations — voire les connaître : 40 modèles du
 * référentiel n'en ont aucune.
 *
 * Une fenêtre curée est tenue pour EXHAUSTIVE sur sa période :
 *  - une motorisation de la source qui y figure prend les années curées ;
 *  - une motorisation de la source qui n'y figure pas en est exclue ;
 *  - une variante curée qu'aucune motorisation de la source ne recouvre est
 *    AJOUTÉE au référentiel.
 *
 * Un fichier JSON par modèle dans `./curated/`, avec la source citée. Ajouter
 * un modèle ne demande donc aucun code — seulement un fichier de données.
 *
 * Puissances en chevaux DIN (cv) : ce sont les chiffres des libellés de la
 * source. Les articles anglophones donnent souvent des kW ou des « hp » —
 * 1 kW = 1,3596 cv, et un « hp » métrique vaut un cv.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { canonicalEngineLabel, parseEngineParts } from '../normalizers/engine-label.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const CURATED_DIR = resolve(HERE, 'curated')

/**
 * Famille du bloc, lue dans le libellé. Elle départage des motorisations de
 * même cylindrée et même puissance : le 1.6 « 156 cv » de la Classe C existe
 * en Kompressor (W203), en CGI (W204) et en injection directe (W205).
 */
export const ENGINE_FAMILIES = ['KOMPRESSOR', 'CGI', 'EQ_BOOST', 'EQ_POWER', 'DIRECT'] as const
export type EngineFamily = (typeof ENGINE_FAMILIES)[number]

const VariantSchema = z.object({
  /** Désignation commerciale, pour la lecture humaine (« C 220 d », « 1.5 dCi »). */
  name: z.string().min(1),
  /** Nombre de tête du libellé quand la marque en use (Mercedes 220, BMW 320). */
  num: z.number().int().positive().nullable().default(null),
  fuel: z.enum(['PETROL', 'DIESEL']),
  /** Cylindrée en litres, telle qu'écrite dans les libellés (2.1 = OM651). */
  displacement: z.number().positive(),
  /** Puissance du moteur thermique en cv (hybrides : hors apport électrique). */
  powerCv: z.number().int().positive(),
  from: z.number().int(),
  to: z.number().int(),
  /** Jetons de famille du libellé à générer : ['dCi'], ['TCe'], ['i'] … */
  tech: z.array(z.string()).default([]),
  /** Transmission quand elle distingue la variante : '4WD', '4MATIC' … */
  drive: z.string().nullable().default(null),
})

const GenerationSchema = z.object({
  code: z.string().min(1),
  from: z.number().int(),
  to: z.number().int(),
  /** Familles de blocs que cette génération n'a jamais reçues. */
  excludedFamilies: z.array(z.enum(ENGINE_FAMILIES)).default([]),
  /**
   * Année d'apparition de l'hybridation légère badgée « EQ Boost » : un
   * libellé qui la porte ne peut correspondre qu'à une variante apparue à
   * partir de là. 9999 = la génération n'en a jamais reçu.
   */
  mildHybridFrom: z.number().int().default(9999),
  variants: z.array(VariantSchema).min(1),
})

const ModelSchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  source: z.string().url(),
  generations: z.array(GenerationSchema).min(1),
})

export type CuratedVariant = z.infer<typeof VariantSchema>
export type CuratedModel = z.infer<typeof ModelSchema>

export interface CuratedGeneration extends z.infer<typeof GenerationSchema> {
  brand: string
  model: string
  source: string
}

function load(): CuratedGeneration[] {
  const out: CuratedGeneration[] = []
  for (const file of readdirSync(CURATED_DIR).filter((f) => f.endsWith('.json')).sort()) {
    const raw: unknown = JSON.parse(readFileSync(join(CURATED_DIR, file), 'utf8'))
    const parsed = ModelSchema.safeParse(raw)
    if (!parsed.success) {
      throw new Error(`Référentiel curé invalide — ${file} : ${parsed.error.issues[0]?.message}`)
    }
    const { brand, model, source, generations } = parsed.data
    for (const g of generations) out.push({ ...g, brand, model, source })
  }
  return out
}

export const CURATED_GENERATIONS: CuratedGeneration[] = load()

/** Comparaison de libellés marque/modèle : casse, espaces et accents ignorés. */
function sameName(a: string, b: string): boolean {
  const key = (v: string) =>
    v
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  return key(a) === key(b)
}

/** Générations curées d'un modèle, de la plus ancienne à la plus récente. */
export function curatedGenerationsFor(brand: string, model: string): CuratedGeneration[] {
  return CURATED_GENERATIONS.filter((g) => sameName(g.brand, brand) && sameName(g.model, model)).sort(
    (a, b) => a.from - b.from,
  )
}

/** Famille du bloc telle qu'annoncée par le libellé. */
export function engineFamily(label: string): EngineFamily {
  if (/kompressor/i.test(label)) return 'KOMPRESSOR'
  if (/\bcgi\b/i.test(label)) return 'CGI'
  if (/eq\s*boost/i.test(label)) return 'EQ_BOOST'
  if (/eq\s*power/i.test(label)) return 'EQ_POWER'
  return 'DIRECT'
}

/**
 * Libellé BRUT d'une variante curée (« 1.5 dCi 90 cv », « 220 CDi 2.1 170 cv »).
 *
 * L'appelant doit le passer par la canonicalisation, comme un libellé de la
 * source : sans ça, un jeton que le canonicaliseur écarte (« 16V ») ou
 * réécrit (« dCi » → graphie dominante de la marque) ferait dériver le fichier
 * à chaque passe, puisque le script relit ce qu'il a écrit.
 */
export function curatedVariantLabel(v: CuratedVariant): string {
  const parts = {
    num: v.num,
    displacement: v.displacement,
    prefix: v.num === null ? [] : v.tech,
    tech: v.num === null ? v.tech : [],
    drive: v.drive,
    powerCv: v.powerCv,
  }
  return canonicalEngineLabel(parts) ?? v.name
}

/** Tolérance de puissance : les libellés arrondissent la conversion kW → cv. */
const CV_TOLERANCE = 4

/**
 * Variante curée correspondant à un libellé, ou null. On exige la désignation,
 * le carburant et la cylindrée ; la puissance départage les variantes d'un même
 * bloc (C 300 essence 245 cv vs C 300 d diesel 245 cv).
 */
export function matchVariant(gen: CuratedGeneration, label: string): CuratedVariant | null {
  const { num, fuel, displacement, powerCv } = parseEngineLabel(label)
  if (displacement === null || powerCv === null) return null
  const family = engineFamily(label)
  if (gen.excludedFamilies.includes(family)) return null
  const candidates = gen.variants.filter(
    (v) =>
      v.num === num &&
      // Carburant inconnu : on ne filtre pas dessus.
      (fuel === null || v.fuel === fuel) &&
      Math.abs(v.displacement - displacement) < 0.05 &&
      (family !== 'EQ_BOOST' || v.from >= gen.mildHybridFrom),
  )
  let best: CuratedVariant | null = null
  let bestGap = Infinity
  for (const v of candidates) {
    const gap = Math.abs(v.powerCv - powerCv)
    if (gap <= CV_TOLERANCE && gap < bestGap) {
      best = v
      bestGap = gap
    }
  }
  return best
}

export interface ParsedLabel {
  num: number | null
  /** `null` quand le libellé ne porte aucun marqueur de carburant. */
  fuel: 'PETROL' | 'DIESEL' | null
  displacement: number | null
  powerCv: number | null
}

/** Marqueurs diesel. Pas de frontière de mot en tête : « BlueHDi » n'en a pas. */
const DIESEL_MARKERS =
  /(cdi|bluetec|bluehdi|hdi|dci|dti|tdi|tdci|crdi|crde|jtd|ddis|ddi|d-?4d|di-?d|multijet)/i
/** Marqueurs diesel d'une ou deux lettres : eux exigent la frontière de mot. */
const SHORT_DIESEL_MARKERS = /(\d\.\d\s*d\b|\bd\b|\bde\b|\btd\b|\bdt\b)/i
/** Marqueurs essence, pour distinguer « sans marqueur » de « essence ». */
const PETROL_MARKERS =
  /(\bi\b|tce|sce|gdi|mpi|vvt|thp|tsi|tfsi|\bfsi\b|puretech|dig-?t|boosterjet|dualjet|kompressor|\bcgi\b|eq\s*(boost|power)|valvematic|mivec|vtec|firefly|ide|\bt\b|turbo|hybrid)/i

/**
 * Lit un libellé Global Auto — « 220 CDi 2.1 CDi 16V 7G-TRONIC BlueTEC 163 cv
 * Boîte auto » — pour en tirer de quoi l'apparier à une variante curée.
 *
 * Le carburant vaut `null` quand rien ne le trahit (« 2.8 4M40 94 cv », qui ne
 * porte qu'un code moteur) : l'appariement ne doit alors PAS présumer de
 * l'essence, sous peine d'écarter une variante diesel légitime.
 */
export function parseEngineLabel(label: string): ParsedLabel {
  const { num, displacement, powerCv } = parseEngineParts(label)
  const diesel = DIESEL_MARKERS.test(label) || SHORT_DIESEL_MARKERS.test(label)
  const petrol = PETROL_MARKERS.test(label)
  return {
    num,
    fuel: diesel ? 'DIESEL' : petrol ? 'PETROL' : null,
    displacement,
    powerCv,
  }
}

/**
 * Arbitre entre la plage relevée dans la source et les générations curées.
 *
 * Renvoie la plage à retenir, ou `null` quand la motorisation n'a sa place dans
 * aucune période connue du modèle.
 */
export function resolveCuratedRange(
  gens: CuratedGeneration[],
  label: string,
  scraped: [number, number | null] | null,
  minYear: number,
  maxYear: number | null,
): [number, number | null] | null {
  if (gens.length === 0) return scraped ?? [minYear, maxYear]

  // Une motorisation peut traverser plusieurs générations curées : on unit les
  // fenêtres où elle figure.
  const hits = gens.flatMap((g) => {
    const v = matchVariant(g, label)
    return v ? [v] : []
  })
  if (hits.length > 0) {
    const from = Math.min(...hits.map((v) => v.from))
    const to = Math.max(...hits.map((v) => v.to))
    const first = Math.min(...gens.map((g) => g.from))
    const last = Math.max(...gens.map((g) => g.to))
    // Hors des fenêtres curées, la source reste la seule information : elle peut
    // étendre la plage, jamais la contredire à l'intérieur.
    const scrapedFrom = scraped?.[0] ?? null
    const scrapedTo = scraped?.[1] ?? null
    return [
      scrapedFrom !== null && scrapedFrom < first ? scrapedFrom : from,
      scrapedTo !== null && scrapedTo > last ? scrapedTo : to,
    ]
  }

  const [from, to] = scraped ?? [minYear, maxYear]
  const end = to ?? maxYear ?? Math.max(...gens.map((g) => g.to))

  // Motorisation absente de toutes les fenêtres curées : elle n'a pas pu être
  // proposée pendant ces années-là. On retranche donc les fenêtres de sa plage
  // et on garde le plus long intervalle restant.
  let intervals: [number, number][] = [[from, end]]
  for (const g of gens) {
    const next: [number, number][] = []
    for (const [a, b] of intervals) {
      if (b < g.from || a > g.to) {
        next.push([a, b])
        continue
      }
      if (a < g.from) next.push([a, g.from - 1])
      if (b > g.to) next.push([g.to + 1, b])
    }
    intervals = next
  }

  if (intervals.length === 0) {
    // Entièrement recouverte : on la repousse du côté où son libellé la situe.
    // Un badge d'électrification la date d'après la dernière fenêtre curée ;
    // sinon elle appartient à une génération antérieure, millésimes inconnus.
    const family = engineFamily(label)
    const electrified = family === 'EQ_BOOST' || family === 'EQ_POWER'
    const last = Math.max(...gens.map((g) => g.to))
    const first = Math.min(...gens.map((g) => g.from))
    if (electrified && maxYear !== null && maxYear > last) return [last + 1, maxYear]
    if (!electrified && first > minYear) return [minYear, first - 1]
    // Nulle part où la replacer : les fenêtres curées couvrent tout le modèle.
    // On la GARDE telle quelle plutôt que de la supprimer — une liste curée
    // incomplète ne doit pas faire disparaître une motorisation réelle. Le
    // conflit est signalé pour compléter le curage.
    return null
  }

  const widest = intervals.reduce((best, i) => (i[1] - i[0] > best[1] - best[0] ? i : best))
  // Borne haute ouverte préservée : « encore produite » ne se referme pas.
  return [widest[0], to === null && widest[1] === end ? null : widest[1]]
}
