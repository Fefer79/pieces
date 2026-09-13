/**
 * Écrit un fichier du référentiel curé (`src/data/curated/*.json`) à partir de
 * lignes relevées sur Wikipédia.
 *
 *   pnpm -F ingest curated:add "MARQUE" "Modèle" "https://fr.wikipedia.org/…" < lignes.txt
 *
 * Format d'entrée, une motorisation par ligne :
 *
 *   CODE_GEN|DÉBUT_GEN|FIN_GEN|NOM|PETROL|cylindrée|puissance_ch|DÉBUT|FIN|TECH|TRANSMISSION
 *
 * C'est le format demandé au moteur de recherche web, pour n'avoir à relire que
 * des données — jamais de la prose. La colonne TRANSMISSION est ignorée sauf
 * quand elle désigne une transmission intégrale (elle sert surtout à noter la
 * boîte, qui n'identifie pas le moteur).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(HERE, '../data/curated')

/** Familles de blocs reconnues dans un nom commercial, du plus long au plus court. */
const TECH_TOKENS = [
  'Blue dCi',
  'BlueHDi',
  'Blue HDi',
  'E-Tech',
  'D-4D',
  'DIG-T',
  'D-CVVT',
  'TwinAir',
  'MultiJet',
  'MultiAir',
  'Puretech',
  'PureTech',
  'EcoBoost',
  'SkyActiv',
  'TDCi',
  'CRDi',
  'DDiS',
  'dCi',
  'dTi',
  'TCe',
  'SCe',
  'TDI',
  'TSI',
  'TFSI',
  'THP',
  'HDi',
  'JTD',
  'CDI',
  'CDi',
  'CRDe',
  'VVT-i',
  'VVTi',
  'VTEC',
  'MPI',
  'GDI',
  'TGDi',
  'MIVEC',
  'DOHC',
  'SOHC',
  'VTi',
  'VVT',
  'i-DTEC',
  'i-VTEC',
  'K9K',
]

const DRIVE_TOKENS: Record<string, string> = {
  '4wd': '4WD',
  awd: '4WD',
  '4x4': '4WD',
  quattro: 'quattro',
  '4motion': '4MOTION',
  '4matic': '4MATIC',
  xdrive: 'xDrive',
}

interface Variant {
  name: string
  num: number | null
  fuel: 'PETROL' | 'DIESEL'
  displacement: number
  powerCv: number
  from: number
  to: number
  tech: string[]
  drive: string | null
}

/** Jetons de famille : la colonne TECH si elle est renseignée, sinon le nom. */
function readTech(tech: string, name: string): string[] {
  if (tech && tech !== '-') return tech.split(/\s*\+\s*/).filter(Boolean)
  const found = TECH_TOKENS.filter((t) => new RegExp(`(?:^|[\\s(])${t}(?:$|[\\s)])`, 'i').test(name))
  // Le plus long gagne : « Blue dCi » plutôt que « dCi ».
  return found.length > 0 ? [found[0] as string] : []
}

function readDrive(drive: string, name: string): string | null {
  for (const [key, value] of Object.entries(DRIVE_TOKENS)) {
    if (new RegExp(`\\b${key}\\b`, 'i').test(drive) || new RegExp(`\\b${key}\\b`, 'i').test(name)) {
      return value
    }
  }
  return null
}

/** Mercedes/BMW nomment par une désignation de tête : « 220 CDi », « 320 d ». */
function readNum(name: string): number | null {
  const m = name.match(/^\s*(\d{2,3})(?=\s|$)/)
  return m ? Number(m[1]) : null
}

function main(): void {
  const [brand, model, source] = process.argv.slice(2)
  if (!brand || !model || !source) {
    throw new Error('usage : curated:add "MARQUE" "Modèle" "URL" < lignes.txt')
  }
  const input = readFileSync(0, 'utf8')

  const gens = new Map<string, { code: string; from: number; to: number; variants: Variant[] }>()
  let skipped = 0
  for (const line of input.split('\n')) {
    const cells = line.split('|').map((c) => c.trim())
    if (cells.length < 9) {
      if (line.trim()) skipped += 1
      continue
    }
    const [code = '', gFrom = '', gTo = '', name = '', fuel = '', disp = '', power = '', vFrom = '', vTo = '', tech = '', drive = ''] =
      cells
    if (fuel !== 'PETROL' && fuel !== 'DIESEL') {
      skipped += 1
      continue
    }
    const displacement = Math.round(Number(disp) * 10) / 10
    const powerCv = Math.round(Number(power))
    if (!displacement || !powerCv || !Number(gFrom)) {
      skipped += 1
      continue
    }
    const gen = gens.get(code) ?? { code, from: Number(gFrom), to: Number(gTo), variants: [] }
    gen.from = Math.min(gen.from, Number(gFrom))
    gen.to = Math.max(gen.to, Number(gTo))
    const variant: Variant = {
      name,
      num: readNum(name),
      fuel,
      displacement,
      powerCv,
      from: Number(vFrom) || Number(gFrom),
      to: Number(vTo) || Number(gTo),
      tech: readTech(tech, name),
      drive: readDrive(drive, name),
    }
    // Même famille, même cylindrée, même puissance, même transmission : une
    // seule entrée. La famille compte — un 1.0 Dualjet de 68 ch n'est pas le
    // 1.0 VVT de 68 ch qu'il remplace.
    const identity = (v: Variant) =>
      `${v.num}|${v.fuel}|${v.displacement}|${v.powerCv}|${v.drive}|${v.tech.join('+').toLowerCase()}`
    const key = identity(variant)
    const twin = gen.variants.find((v) => identity(v) === key)
    if (twin) {
      twin.from = Math.min(twin.from, variant.from)
      twin.to = Math.max(twin.to, variant.to)
    } else {
      gen.variants.push(variant)
    }
    gens.set(code, gen)
  }

  const generations = [...gens.values()]
    .sort((a, b) => a.from - b.from)
    .map((g) => ({
      code: g.code,
      from: g.from,
      to: g.to,
      excludedFamilies: [],
      mildHybridFrom: 9999,
      variants: g.variants.sort(
        (a, b) => a.displacement - b.displacement || a.powerCv - b.powerCv,
      ),
    }))

  const slug = (v: string) =>
    v
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  const out = resolve(OUT_DIR, `${slug(brand)}-${slug(model)}.json`)
  writeFileSync(out, `${JSON.stringify({ brand, model, source, generations }, null, 1)}\n`, 'utf8')

  const count = generations.reduce((n, g) => n + g.variants.length, 0)
  console.log(`✓ ${out}`)
  console.log(`  ${generations.length} génération(s), ${count} motorisation(s)${skipped > 0 ? `, ${skipped} ligne(s) ignorée(s)` : ''}`)
}

main()
