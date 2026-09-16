/**
 * Backfill de la catégorie des pièces sans catégorie EXPLOITABLE, à partir de
 * leur TITRE.
 *
 * Deux cas laissent une pièce hors de tous les filtres catégorie du browse
 * (`where.category = "Freinage"`, égalité stricte) :
 *  1. `category IS NULL` — la source ne fournit pas de catégorie (CoinAfrique
 *     sans `data-ad-category`, Mobristore qui n'en fournit jamais).
 *  2. `category` renseigné mais avec le libellé BRUT du site source, jamais
 *     mappé vers la taxonomie Pièces (`PART_CATEGORIES`) — ex. GLOBAL_AUTO_CI
 *     stocke littéralement « Plaquettes de frein et chaussures » au lieu de
 *     « Freinage ». Ce cas est silencieux : la pièce a l'air catégorisée en
 *     base, mais ne matche jamais un filtre catalogue.
 *
 * Ce script déduit `category` depuis `name` via le moteur de mots-clés déjà testé
 * de `matchLogisticsFamily` (packages/shared/constants/logistics.ts), en ne gardant
 * que les familles dont le mapping vers une catégorie catalogue (`PART_CATEGORIES`)
 * est sans ambiguïté — les familles trop génériques (joints, pompes, petite
 * électronique...) sont volontairement laissées de côté plutôt que de risquer un
 * mauvais classement.
 *
 * Idempotent : ne cible que les pièces avec `category IS NULL` ou hors taxonomie ;
 * une fois réécrite avec une valeur de `PART_CATEGORIES`, une pièce sort du filtre
 * et n'est plus retouchée aux exécutions suivantes.
 * Dry-run par défaut — n'écrit en base qu'avec le flag `--commit`.
 *
 * ⚠️ La prod (Prisma Postgres, db.prisma.io) n'est PAS la cible par défaut : le
 * .env du repo pointe sur un Supabase legacy. Pour viser la prod, surcharger
 * explicitement DATABASE_URL avec l'URL du dashboard Render.
 *
 *   pnpm -F ingest tsx src/scripts/backfill-catalog-categories.ts            # dry-run
 *   DATABASE_URL='postgres://…prod…' \
 *     pnpm -F ingest tsx src/scripts/backfill-catalog-categories.ts --commit # écriture
 */
import type { Prisma } from '@prisma/client'
import { matchLogisticsFamily, PART_CATEGORIES, type PartCategory } from 'shared/constants'
import { prisma } from '../lib/prisma.ts'

/**
 * Familles logistiques → catégorie catalogue, uniquement quand le rattachement
 * est sans ambiguïté. Les familles absentes de cette table (GASKET, PUMP,
 * SMALL_ELECTRIC, WIPER_MIRROR, GENERIC...) mélangent plusieurs catégories
 * catalogue possibles : on préfère laisser ces pièces non catégorisées plutôt
 * que de deviner faux.
 */
const FAMILY_TO_CATEGORY: Partial<Record<string, PartCategory>> = {
  FILTER: 'Filtration',
  BRAKE_PADS: 'Freinage',
  BRAKE_DISCS: 'Freinage',
  BELT_KIT: 'Distribution',
  SHOCK_ABSORBER: 'Suspension',
  SUSPENSION_ARM: 'Suspension',
  ALTERNATOR_STARTER: 'Démarrage & charge',
  TURBO: 'Admission & turbo',
  AC_COMPRESSOR: 'Climatisation & chauffage',
  CLUTCH_KIT: 'Embrayage',
  ENGINE_HEAVY_PART: 'Moteur',
  ENGINE: 'Moteur',
  RADIATOR: 'Refroidissement',
  HEADLIGHT: 'Éclairage & signalisation',
  EXHAUST: 'Échappement',
  STEERING: 'Direction',
  DRIVESHAFT: 'Transmission',
  BUMPER: 'Carrosserie extérieure',
  BODY_PANEL: 'Carrosserie extérieure',
  WINDSHIELD: 'Vitrage',
  BATTERY: 'Électrique & batterie',
  WHEEL: 'Roues & pneus',
  TYRE: 'Roues & pneus',
  GEARBOX: 'Boîte de vitesses',
  EV_HV_COMPONENT: 'Électrique & batterie',
}

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
const normalize = (s: string) => stripAccents(s.toLowerCase()).replace(/[^a-z0-9]+/g, ' ')

/**
 * Certains mots-clés de `matchLogisticsFamily` sont trop génériques hors
 * contexte "poids logistique" et créent de faux positifs de catégorie, vus en
 * dry-run sur données réelles :
 *  - "butee" (CLUTCH_KIT) matche aussi « butée de porte » → Embrayage à tort.
 *  - "condenseur" (RADIATOR) est quasi toujours le condenseur de clim, pas le
 *    radiateur moteur, sans le mot "radiateur" en plus.
 * On exige un second mot-clé plus spécifique avant de retenir ces familles.
 */
const REQUIRE_IF_FAMILY: Partial<Record<string, string[]>> = {
  CLUTCH_KIT: ['embrayage'],
  RADIATOR: ['radiateur', 'refroidissement'],
}

/**
 * Faux positifs vus en dry-run : le mot déclencheur apparaît dans un sens
 * différent de celui visé par la famille logistique.
 *  - "pneumatique" (TYRE) matche « suspension pneumatique », sans rapport
 *    avec les pneus.
 *  - "vitre" (WINDSHIELD) matche « lave-vitre »/« lave-glace », qui est le
 *    système de lave-glace, pas le vitrage.
 */
const EXCLUDE_IF_CONTAINS: Partial<Record<PartCategory, string[]>> = {
  'Roues & pneus': ['suspension'],
  Vitrage: ['lave vitre', 'lave glace'],
}

function containsWord(haystack: string, word: string): boolean {
  return new RegExp(`(?:^| )${word}s?(?:$| )`).test(haystack)
}

/**
 * "capteur"/"sonde"/"calculateur" ne sont pas retenus via `matchLogisticsFamily`
 * (famille SMALL_ELECTRIC, trop générique — mélange aussi bougies, ampoules,
 * fusibles, injecteurs...). Ce sont pourtant des cas fréquents et sans
 * ambiguïté une fois isolés : PART_CATALOG liste « Capteur de température »,
 * « Capteur de pression », « Calculateur moteur (ECU) »... sous
 * `Capteurs & calculateurs` — SAUF « Capteur ABS avant/arrière », qui est
 * explicitement listé sous `Freinage` (le capteur de vitesse de roue fait
 * partie du système de freinage, pas de l'électronique générique).
 */
function resolveSensorCategory(normalized: string): PartCategory | undefined {
  const isSensor = ['capteur', 'sonde', 'calculateur'].some((k) => containsWord(normalized, k))
  if (!isSensor) return undefined
  if (containsWord(normalized, 'capteur') && containsWord(normalized, 'abs')) return 'Freinage'
  return 'Capteurs & calculateurs'
}

/**
 * Autres concepts hors du vocabulaire de `matchLogisticsFamily` (sans rapport
 * avec le poids/volume logistique), fréquents et sans ambiguïté dans les
 * titres scrapés, mappés d'après `PART_CATALOG` :
 *  - Compteur (de vitesse, compte-tours, tableau de bord, combiné
 *    d'instruments) → Carrosserie intérieure.
 *  - Airbag (conducteur/passager/rideau/latéral) → Carrosserie intérieure.
 *    « Calculateur airbag » est déjà capté avant, par `resolveSensorCategory`
 *    (mot-clé "calculateur"), qui le classe correctement en
 *    Capteurs & calculateurs — cette règle ne voit donc que les airbags
 *    physiques.
 *  - Caméra (de recul, écran caméra de recul, radar de recul) → Navigation &
 *    connectivité, comme le reste du bloc GPS/Bluetooth/dashcam.
 */
function resolveDashboardCategory(normalized: string): PartCategory | undefined {
  const isCompteur =
    containsWord(normalized, 'compteur') ||
    normalized.includes('compte tours') ||
    normalized.includes('tableau de bord') ||
    normalized.includes('combine d instruments')
  if (isCompteur) return 'Carrosserie intérieure'
  if (containsWord(normalized, 'airbag')) return 'Carrosserie intérieure'
  if (containsWord(normalized, 'camera')) return 'Navigation & connectivité'
  return undefined
}

function resolveFallbackCategory(normalized: string): PartCategory | undefined {
  return resolveSensorCategory(normalized) ?? resolveDashboardCategory(normalized)
}

function resolveCategory(name: string | null): PartCategory | undefined {
  const normalized = normalize(name ?? '')
  const family = matchLogisticsFamily(name)
  const category = family ? FAMILY_TO_CATEGORY[family.id] : undefined

  if (!family || !category) return resolveFallbackCategory(normalized)

  const requireList = REQUIRE_IF_FAMILY[family.id]
  if (requireList && !requireList.some((k) => normalized.includes(k))) return resolveFallbackCategory(normalized)

  const excludeList = EXCLUDE_IF_CONTAINS[category]
  if (excludeList && excludeList.some((k) => normalized.includes(k))) return resolveFallbackCategory(normalized)

  return category
}

async function main(): Promise<void> {
  const commit = process.argv.includes('--commit')
  console.log(`[backfill-categories] mode = ${commit ? 'COMMIT (écriture)' : 'DRY-RUN (lecture seule)'}`)
  console.log(`[backfill-categories] DATABASE_URL host = ${dbHost()}`)

  // Hors taxonomie = category non-null mais dont la valeur n'est pas l'une des
  // PART_CATEGORIES canoniques (libellé brut du site source, jamais mappé).
  const where: Prisma.CatalogItemWhereInput = {
    OR: [{ category: null }, { category: { notIn: [...PART_CATEGORIES] } }],
  }

  const bySource = await prisma.catalogItem.groupBy({
    by: ['externalSource'],
    where,
    _count: { _all: true },
  })
  console.log(`[backfill-categories] répartition des pièces sans catégorie exploitable par source :`)
  for (const row of bySource.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`  ${row.externalSource ?? '(manuel / vendeur direct)'}: ${row._count._all}`)
  }

  const items = await prisma.catalogItem.findMany({
    where,
    select: { id: true, name: true, category: true },
  })
  console.log(`\n[backfill-categories] ${items.length} pièces candidates (catégorie nulle ou hors taxonomie)`)

  let matched = 0
  let written = 0
  const matchedByFamily = new Map<string, number>()
  const namesByCategory = new Map<string, string[]>()
  const unmatched: string[] = []
  const SAMPLE_SIZE = 8

  for (const item of items) {
    const category = resolveCategory(item.name)
    if (!category) {
      unmatched.push(item.name ?? '(sans nom)')
      continue
    }
    matched += 1
    matchedByFamily.set(category, (matchedByFamily.get(category) ?? 0) + 1)
    const samples = namesByCategory.get(category) ?? []
    if (samples.length < SAMPLE_SIZE) {
      samples.push(item.name ?? '(sans nom)')
      namesByCategory.set(category, samples)
    }
    if (commit) {
      await prisma.catalogItem.update({
        where: { id: item.id },
        data: { category },
      })
      written += 1
    }
  }

  console.log(`\n[backfill-categories] résumé :`)
  console.log(`  pièces avec catégorie déduite : ${matched}/${items.length}`)
  console.log(`  écritures en base              : ${commit ? written : 0}${commit ? '' : ' (dry-run)'}`)
  console.log(`  sans catégorie déduite         : ${unmatched.length}`)
  if (matchedByFamily.size > 0) {
    console.log(`\n[backfill-categories] détail par catégorie déduite, avec échantillon de TITRES réels (à relire avant --commit) :`)
    for (const [category, count] of [...matchedByFamily.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`\n  ${category}: ${count}`)
      for (const name of namesByCategory.get(category) ?? []) {
        console.log(`    - ${name}`)
      }
    }
  }
  if (unmatched.length > 0) {
    console.log(`\n[backfill-categories] échantillon sans catégorie déduite (titres trop génériques ou famille ambiguë) :`)
    for (const u of unmatched.slice(0, 30)) console.log(`  - ${u}`)
    if (unmatched.length > 30) console.log(`  … (+${unmatched.length - 30})`)
  }

  await prisma.$disconnect()
}

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? '').host || '(inconnu)'
  } catch {
    return '(inconnu)'
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
