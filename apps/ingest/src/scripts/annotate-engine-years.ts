/**
 * Annote chaque motorisation du référentiel curé avec sa plage d'années.
 *
 *   pnpm -F ingest annotate:engine-years            # relit le cache brut
 *   pnpm -F ingest annotate:engine-years --refresh  # re-scrape la source
 *
 * Contrairement à `export:vehicles`, ce script N'ÉCRASE PAS le curage manuel :
 * il ne touche ni aux marques, ni aux modèles, ni aux libellés moteur du
 * fichier. Il ne fait qu'ajouter/rafraîchir la plage `[début, fin]` de chaque
 * moteur déjà présent dans `packages/shared/constants/vehicles-data.ts`.
 *
 * La plage vient des lignes de compatibilité Global Auto — pas de la table
 * `vehicle_engines`, qui ne peut rattacher une motorisation qu'à UNE
 * génération là où la source en déclare souvent plusieurs. Le tri des
 * générations légitimes et des fourre-tout est dans `normalizers/trim-series`.
 *
 * Un moteur introuvable dans la source (ou sans génération datée) reçoit la
 * plage complète du modèle : on préfère le montrer à tort que le cacher à tort.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vehiclesData from 'shared/constants/vehicles-data'
import { streamAllProducts } from '../sources/global-auto.ts'
import { resolveTrimYearRanges, type CompatPair } from '../normalizers/trim-series.ts'
import {
  CURATED_GENERATIONS,
  curatedGenerationsFor,
  curatedVariantLabel,
  matchVariant,
  resolveCuratedRange,
} from '../data/curated-generations.ts'
import { buildSpellingMap, canonicalEngineLabel, parseEngineParts } from '../normalizers/engine-label.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../../../../packages/shared/constants/vehicles-data.ts')
const CACHE = resolve(HERE, '../../data/raw/global-auto-trim-series.json')

type RawEngine = string | [string, number, number | null]
type RawModel = { years: number[]; engines: RawEngine[] }
type RawData = Record<string, { models: Record<string, RawModel> }>

const data = vehiclesData as unknown as RawData

/** Paire enrichie des noms marque/modèle, seule clé de rapprochement avec le fichier curé. */
interface NamedPair extends CompatPair {
  makeName: string
  modelName: string
}

/** Clé de rapprochement libellé curé ↔ libellé source : casse/espaces/accents ignorés. */
function normalize(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function engineName(e: RawEngine): string {
  return typeof e === 'string' ? e : e[0]
}

/** Sérialisation compacte, miroir du format existant (arrays en ligne). */
function serialize(out: RawData): string {
  const lines: string[] = ['export default {']
  const brands = Object.entries(out)
  brands.forEach(([brand, { models }], bi) => {
    lines.push(`  ${JSON.stringify(brand)}: {`)
    lines.push('    "models": {')
    const entries = Object.entries(models)
    entries.forEach(([model, entry], mi) => {
      const years = `[${entry.years.join(',')}]`
      const engines = entry.engines
        .map((e) =>
          typeof e === 'string'
            ? JSON.stringify(e)
            : `[${JSON.stringify(e[0])},${e[1]},${e[2] === null ? 'null' : e[2]}]`,
        )
        .join(',')
      lines.push(`      ${JSON.stringify(model)}: {`)
      lines.push(`        "years": ${years},`)
      lines.push(`        "engines": [${engines}]`)
      lines.push(`      }${mi < entries.length - 1 ? ',' : ''}`)
    })
    lines.push('    }')
    lines.push(`  }${bi < brands.length - 1 ? ',' : ''}`)
  })
  lines.push('}')
  return lines.join('\n')
}

/** Relève toutes les paires (motorisation, génération) déclarées par les produits. */
async function harvest(): Promise<NamedPair[]> {
  const pairs = new Map<string, NamedPair>()
  for await (const page of streamAllProducts(500)) {
    for (const p of page.products) {
      for (const c of p.vehicle_compatibility) {
        if (
          c.trim_id == null ||
          !c.trim_name ||
          c.series_id == null ||
          c.model_id == null ||
          !c.make_name ||
          !c.model_name
        ) {
          continue
        }
        const key = `${c.trim_id}:${c.series_id}`
        if (pairs.has(key)) continue
        pairs.set(key, {
          trimId: c.trim_id,
          trimName: c.trim_name,
          seriesId: c.series_id,
          seriesName: c.series_name ?? '',
          modelId: c.model_id,
          makeName: c.make_name,
          modelName: c.model_name,
        })
      }
    }
    console.log(`[global-auto] page ${page.page}/${page.totalPages} — ${pairs.size} paires`)
  }
  return [...pairs.values()]
}

async function loadPairs(refresh: boolean): Promise<NamedPair[]> {
  if (!refresh) {
    try {
      const raw = await readFile(CACHE, 'utf8')
      const cached = JSON.parse(raw) as { pairs: NamedPair[] }
      console.log(`↻ cache : ${cached.pairs.length} paires (${CACHE})`)
      return cached.pairs
    } catch {
      console.log('… pas de cache exploitable, relevé depuis la source')
    }
  }
  const pairs = await harvest()
  await mkdir(dirname(CACHE), { recursive: true })
  await writeFile(CACHE, JSON.stringify({ fetchedAt: new Date().toISOString(), pairs }, null, 0), 'utf8')
  return pairs
}

async function main(): Promise<void> {
  const pairs = await loadPairs(process.argv.includes('--refresh'))
  const byTrim = resolveTrimYearRanges(pairs)

  // Graphie de référence par marque, apprise sur les libellés de la SOURCE (et
  // non sur le fichier, pour que le résultat ne dépende pas de son état) : le
  // « d » de Mercedes ne doit pas écraser le « D-4D » de Toyota.
  const labelsByMake = new Map<string, string[]>()
  for (const p of pairs) {
    const key = normalize(p.makeName)
    const list = labelsByMake.get(key) ?? []
    list.push(p.trimName)
    labelsByMake.set(key, list)
  }
  const spelling = new Map<string, Map<string, string>>()
  for (const [make, labels] of labelsByMake) spelling.set(make, buildSpellingMap(labels))

  /** Forme canonique d'un libellé, seule clé stable entre la source et le fichier. */
  const canonical = (brand: string, label: string): string =>
    canonicalEngineLabel(parseEngineParts(label), spelling.get(normalize(brand))) ?? label

  // (marque|modèle|moteur normalisés) → plage, dédupliquée sur les trim_id
  // homonymes (la source en crée pour une même motorisation).
  const ranges = new Map<string, { from: number; to: number | null }>()
  for (const p of pairs) {
    const range = byTrim.get(p.trimId)
    if (!range) continue
    const key = `${normalize(p.makeName)}|${normalize(p.modelName)}|${normalize(canonical(p.makeName, p.trimName))}`
    const cur = ranges.get(key)
    if (!cur) {
      ranges.set(key, { ...range })
      continue
    }
    cur.from = Math.min(cur.from, range.from)
    cur.to = cur.to === null || range.to === null ? null : Math.max(cur.to, range.to)
  }

  let annotated = 0
  let unmatched = 0
  let curatedFix = 0
  let collapsed = 0
  let added = 0
  const degenerate: string[] = []
  const unresolved: string[] = []
  const suspect: string[] = []

  const out: RawData = {}
  for (const [brand, { models }] of Object.entries(data)) {
    const outModels: Record<string, RawModel> = {}
    for (const [model, entry] of Object.entries(models)) {
      const minYear = entry.years.length > 0 ? Math.min(...entry.years) : 1980
      const maxYear = entry.years.length > 0 ? Math.max(...entry.years) : null
      const curated = curatedGenerationsFor(brand, model)
      const dated: RawEngine[] = entry.engines.map((e) => {
        const name = engineName(e)
        const hit = ranges.get(`${normalize(brand)}|${normalize(model)}|${normalize(canonical(brand, name))}`)
        // À défaut de relevé dans la source, la plage déjà inscrite dans le
        // fichier fait foi : c'est le résultat de la passe précédente (ou un
        // curage à la main), et la jeter rendrait le script non idempotent.
        const previous: [number, number | null] | null =
          typeof e === 'string' ? null : [e[1], e[2]]
        const scraped: [number, number | null] | null = hit
          ? [Math.max(hit.from, minYear), hit.to === null ? maxYear : Math.min(hit.to, maxYear ?? hit.to)]
          : previous
        if (hit) annotated += 1
        else unmatched += 1

        let range = resolveCuratedRange(curated, name, scraped, minYear, maxYear)
        if (!range) {
          // Aucune fenêtre curée ne peut l'accueillir et il n'y a pas de place
          // en dehors : le curage de ce modèle est incomplet. On conserve la
          // motorisation avec sa plage d'origine et on le signale.
          unresolved.push(`${brand} ${model} — ${name}`)
          range = scraped ?? [minYear, maxYear]
        }
        if (curated && scraped && (range[0] !== scraped[0] || range[1] !== scraped[1])) curatedFix += 1
        return [name, range[0], range[1]] as RawEngine
      }).filter((e): e is RawEngine => e !== null)

      // La source livre une ligne par déclinaison commerciale : on regroupe
      // celles qui désignent le même moteur, en unissant leurs plages.
      const merged = new Map<string, { label: string; from: number; to: number | null; open: boolean }>()
      for (const e of dated) {
        const [label, from, to] = typeof e === 'string' ? [e, minYear, maxYear] : e
        const display = canonical(brand, label)
        const key = display
        const cur = merged.get(key)
        if (!cur) {
          merged.set(key, { label: display, from, to: to ?? maxYear, open: to === null })
          continue
        }
        cur.from = Math.min(cur.from, from)
        if (to === null) cur.open = true
        else cur.to = cur.to === null ? to : Math.max(cur.to, to)
      }
      // Recoupement curage ↔ source : une variante curée que la source ne
      // connaît pas est normale (elle complète le référentiel), mais un modèle
      // dont AUCUNE variante ne retrouve un libellé de la source alors que la
      // source en a plusieurs signale des données curées douteuses.
      if (curated.length > 0 && dated.length >= 3) {
        const variants = curated.flatMap((g) => g.variants)
        const matched = variants.filter((v) =>
          dated.some((e) => {
            const label = typeof e === 'string' ? e : e[0]
            return curated.some((g) => matchVariant(g, label)?.name === v.name)
          }),
        ).length
        if (matched === 0) {
          suspect.push(`${brand} ${model} (0/${variants.length} variantes retrouvées dans la source)`)
        }
      }

      // Variantes curées qu'aucun libellé de la source ne recouvre : elles
      // complètent le référentiel (40 modèles n'avaient aucune motorisation).
      for (const gen of curated) {
        for (const variant of gen.variants) {
          const covered = dated.some((e) => {
            const label = typeof e === 'string' ? e : e[0]
            return matchVariant(gen, label)?.name === variant.name
          })
          if (covered) continue
          const label = canonical(brand, curatedVariantLabel(variant))
          // La plage passe par la même résolution que pour un libellé de la
          // source — la tolérance de puissance peut apparier la variante à
          // plusieurs générations, et le script doit trouver le même résultat
          // à la passe suivante, quand ce libellé sera dans le fichier.
          const [from, to] = resolveCuratedRange(curated, label, null, minYear, maxYear) ?? [
            variant.from,
            variant.to,
          ]
          const cur = merged.get(label)
          if (!cur) {
            merged.set(label, { label, from, to, open: false })
            added += 1
            continue
          }
          cur.from = Math.min(cur.from, from)
          if (!cur.open && to !== null) cur.to = cur.to === null ? to : Math.max(cur.to, to)
        }
      }

      if (dated.length > merged.size) collapsed += dated.length - merged.size

      const engines: RawEngine[] = [...merged.values()]
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
        .map((m) => [m.label, m.from, m.open ? null : m.to] as RawEngine)

      // Couverture : part des millésimes du modèle où au moins un moteur reste
      // proposable. Sous 40 %, les générations de la source sont manifestement
      // trop lacunaires — on relâche le filtre plutôt que d'aboutir à du vide.
      const covered = entry.years.filter((y) =>
        engines.some((e) => typeof e !== 'string' && e[1] <= y && (e[2] ?? Infinity) >= y),
      ).length
      if (engines.length > 0 && entry.years.length > 0 && covered / entry.years.length < 0.4) {
        degenerate.push(`${brand} ${model} (${covered}/${entry.years.length} millésimes couverts)`)
        outModels[model] = {
          years: entry.years,
          engines: engines.map((e) => [engineName(e), minYear, maxYear] as RawEngine),
        }
        continue
      }
      outModels[model] = { years: entry.years, engines }
    }
    out[brand] = { models: outModels }
  }

  // Modèles présents dans le référentiel curé mais absents du référentiel
  // véhicules : la source ne les connaît pas, le curage les fait exister.
  const maxYearNow = new Date().getFullYear()
  let createdModels = 0
  for (const gen of CURATED_GENERATIONS) {
    const brandKey = Object.keys(out).find((b) => normalize(b) === normalize(gen.brand)) ?? gen.brand
    const models = (out[brandKey] ??= { models: {} }).models
    const modelKey = Object.keys(models).find((m) => normalize(m) === normalize(gen.model))
    if (modelKey) continue
    const sameModel = CURATED_GENERATIONS.filter(
      (g) => normalize(g.brand) === normalize(gen.brand) && normalize(g.model) === normalize(gen.model),
    )
    const years = new Set<number>()
    const engines = new Map<string, RawEngine>()
    for (const g of sameModel) {
      for (let y = g.from; y <= Math.min(g.to, maxYearNow); y++) years.add(y)
      for (const v of g.variants) {
        const label = canonical(gen.brand, curatedVariantLabel(v))
        const resolved = resolveCuratedRange(sameModel, label, null, g.from, Math.min(g.to, maxYearNow))
        const [vFrom, vTo] = resolved ?? [v.from, v.to]
        const previous = engines.get(label)
        const from = previous && typeof previous !== 'string' ? Math.min(previous[1], vFrom) : vFrom
        const to =
          previous && typeof previous !== 'string'
            ? Math.max(previous[2] ?? vTo ?? v.to, vTo ?? v.to)
            : (vTo ?? v.to)
        engines.set(label, [label, from, Math.min(to, maxYearNow)])
      }
    }
    models[gen.model] = {
      years: [...years].sort((a, b) => a - b),
      engines: [...engines.values()].sort((a, b) =>
        engineName(a).localeCompare(engineName(b), 'fr'),
      ),
    }
    createdModels += 1
    added += engines.size
  }

  const header =
    '// Référentiel véhicules curé — édité à la main.\n' +
    "// (Anciennement auto-généré depuis la base scrapée ; `pnpm -F ingest export:vehicles`\n" +
    "//  est désactivé par défaut et écraserait le curage — voir export-vehicles-data.ts.)\n" +
    '// Les modèles listés ici pilotent le filtrage de compatibilité (fitments) :\n' +
    "// un modèle absent du référentiel ne peut pas être reconnu dans un titre d'annonce.\n" +
    '//\n' +
    "// Format moteur : [libellé, première année, dernière année | null si encore produit].\n" +
    '// La plage vient des générations Global Auto (`pnpm -F ingest annotate:engine-years`)\n' +
    '// et pilote le filtrage par millésime (getEngines(marque, modèle, année)).\n' +
    "// Un moteur dont la plage couvre tout le modèle = plage inconnue, affiché partout.\n"

  await writeFile(OUT, `${header}${serialize(out)}\n`, 'utf8')

  console.log(`✓ écrit ${OUT}`)
  console.log(`  moteurs datés : ${annotated}`)
  console.log(`  moteurs sans correspondance (plage modèle) : ${unmatched}`)
  console.log(`  plages corrigées par le référentiel curé : ${curatedFix}`)
  console.log(`  doublons de libellé fusionnés : ${collapsed}`)
  console.log(`  motorisations ajoutées depuis le référentiel curé : ${added}`)
  if (createdModels > 0) console.log(`  modèles créés par le référentiel curé : ${createdModels}`)
  if (suspect.length > 0) {
    console.log(`  ⚠ ${suspect.length} modèles au curage douteux (à revérifier à la source) :`)
    for (const m of suspect) console.log(`    - ${m}`)
  }
  if (unresolved.length > 0) {
    const models = [...new Set(unresolved.map((u) => u.split(' — ')[0]))]
    console.log(
      `  ⚠ ${unresolved.length} moteurs qu'aucune fenêtre curée n'accueille (curage à compléter) :`,
    )
    for (const m of models) console.log(`    - ${m} (${unresolved.filter((u) => u.startsWith(`${m} `)).length})`)
  }
  if (degenerate.length > 0) {
    console.log(`  ⚠ ${degenerate.length} modèles à curer (générations source lacunaires) :`)
    for (const d of degenerate) console.log(`    - ${d}`)
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exitCode = 1
})
