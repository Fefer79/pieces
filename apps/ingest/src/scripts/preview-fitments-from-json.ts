/**
 * Aperçu HORS-LIGNE du backfill de fitments — zéro accès base.
 * Lit un JSON [{ name, vehicleCompatibility, externalSource }] (extrait via SQL)
 * et applique la MÊME logique que backfill-all-fitments.ts pour estimer le taux
 * de détection et échantillonner les déductions. N'écrit rien.
 *
 *   pnpm -F ingest tsx src/scripts/preview-fitments-from-json.ts <chemin.json>
 */
import { readFileSync } from 'node:fs'
import { extractFitmentsFromName, parseCompatibilityText } from 'shared/constants'

interface Row {
  name: string | null
  vehicleCompatibility: string | null
  externalSource: string | null
}

interface FitmentInput {
  brand: string
  model: string | null
  yearFrom: number | null
  yearTo: number | null
}

function deriveFitments(name: string | null, compat: string | null): FitmentInput[] {
  const fromText = parseCompatibilityText(compat)
  if (fromText) return [fromText]
  return extractFitmentsFromName(name).map((f) => ({
    brand: f.brand,
    model: f.model,
    yearFrom: f.yearFrom,
    yearTo: f.yearTo,
  }))
}

const path = process.argv[2]
if (!path) {
  console.error('usage: preview-fitments-from-json.ts <chemin.json>')
  process.exit(1)
}
const rows = JSON.parse(readFileSync(path, 'utf8')) as Row[]

let withFitment = 0
let fitmentsTotal = 0
const bySource = new Map<string, { matched: number; total: number }>()
const unmatched: string[] = []
const sample: string[] = []
const brandCount = new Map<string, number>()

for (const r of rows) {
  const src = r.externalSource ?? '(manuel)'
  const agg = bySource.get(src) ?? { matched: 0, total: 0 }
  agg.total += 1
  const fitments = deriveFitments(r.name, r.vehicleCompatibility)
  if (fitments.length === 0) {
    unmatched.push(r.name ?? '(sans nom)')
    bySource.set(src, agg)
    continue
  }
  withFitment += 1
  fitmentsTotal += fitments.length
  agg.matched += 1
  bySource.set(src, agg)
  for (const f of fitments) brandCount.set(f.brand, (brandCount.get(f.brand) ?? 0) + 1)
  if (sample.length < 40) {
    const desc = fitments
      .map((f) => [f.brand, f.model, f.yearFrom && `${f.yearFrom}${f.yearTo ? `-${f.yearTo}` : '+'}`].filter(Boolean).join(' '))
      .join(' | ')
    sample.push(`  "${r.name}" → ${desc}`)
  }
}

console.log(`\n[preview] ${rows.length} articles candidats`)
console.log(`  avec marque détectée : ${withFitment} (${((withFitment / rows.length) * 100).toFixed(1)}%)`)
console.log(`  fitments à écrire    : ${fitmentsTotal}`)
console.log(`  sans marque          : ${unmatched.length}`)

console.log(`\n[preview] par source :`)
for (const [src, agg] of [...bySource.entries()].sort((a, b) => b[1].total - a[1].total)) {
  console.log(`  ${src.padEnd(16)} ${agg.matched}/${agg.total} (${((agg.matched / agg.total) * 100).toFixed(0)}%)`)
}

console.log(`\n[preview] top marques détectées :`)
for (const [brand, n] of [...brandCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${brand.padEnd(16)} ${n}`)
}

console.log(`\n[preview] échantillon des déductions :`)
for (const s of sample) console.log(s)

console.log(`\n[preview] échantillon sans marque :`)
for (const u of unmatched.slice(0, 25)) console.log(`  - ${u}`)
if (unmatched.length > 25) console.log(`  … (+${unmatched.length - 25})`)
