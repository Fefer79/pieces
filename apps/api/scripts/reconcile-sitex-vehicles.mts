/**
 * Réconcilie la flotte véhicules d'une entreprise sur la liste voitures Yango
 * officielle (summary_cars_list.csv), puis restaure les affectations valides à
 * partir de l'export conducteurs (uniquement pour les plaques réellement
 * présentes dans la liste officielle).
 *
 * - Supprime les véhicules existants de l'entreprise (cascade → affectations).
 * - Réimporte via le service natif importVehiclesFromCsv (prouve le support du
 *   format « liste voitures » de bout en bout).
 * - Recrée les affectations chauffeur↔véhicule valides (résolution par nom +
 *   plaque canonique), en ignorant les noms ambigus / déjà affectés.
 *
 * Usage :
 *   cd apps/api
 *   pnpm tsx --env-file=.env scripts/reconcile-sitex-vehicles.mts \
 *     --slug sitex --owner fernando.kouame@gmail.com \
 *     --cars "/Users/mac/Downloads/summary_cars_list.csv" \
 *     --drivers "/Users/mac/Downloads/contractor_profiles_manager_segment_v2_contractors.csv"
 */
import { readFileSync } from 'node:fs'
import { prisma } from '../src/lib/prisma.js'
import { importVehiclesFromCsv, parseCsv } from '../src/modules/enterprise/vehicle.service.js'

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i !== -1 ? process.argv[i + 1] : undefined
}

const slug = arg('--slug')
const ownerEmail = arg('--owner')
const carsFile = arg('--cars')
const driversFile = arg('--drivers')

if (!slug || !ownerEmail || !carsFile) {
  console.error('Usage: --slug <slug> --owner <email> --cars <fichier> [--drivers <fichier>]')
  process.exit(1)
}

const canonicalPlate = (p: string) => p.toUpperCase().replace(/[^A-Z0-9]/g, '')

const ent = await prisma.enterprise.findUnique({ where: { slug }, select: { id: true, name: true } })
if (!ent) {
  console.error(`Entreprise introuvable pour le slug ${slug}`)
  process.exit(1)
}
const owner = await prisma.user.findFirst({ where: { email: ownerEmail }, select: { id: true } })
if (!owner) {
  console.error(`Propriétaire introuvable : ${ownerEmail}`)
  process.exit(1)
}

// 1. Purge des véhicules existants (cascade sur les affectations).
const before = await prisma.vehicle.count({ where: { enterpriseId: ent.id } })
await prisma.vehicle.deleteMany({ where: { enterpriseId: ent.id } })
console.log(`Purge : ${before} véhicule(s) supprimé(s) de « ${ent.name} »`)

// 2. Réimport via le service natif (liste voitures Yango → année 2026 réelle).
const carsCsv = readFileSync(carsFile, 'utf8')
const result = await importVehiclesFromCsv(ent.id, owner.id, carsCsv)
console.log(`Import : ${result.created} véhicule(s) créé(s)` + (result.errors.length ? ` · ${result.errors.length} erreur(s)` : ''))
for (const e of result.errors) console.log(`   - ${e.line ? `L${e.line}: ` : ''}${e.message}`)

// 3. Restauration des affectations valides depuis l'export conducteurs.
let assigned = 0
if (driversFile) {
  const vehicles = await prisma.vehicle.findMany({ where: { enterpriseId: ent.id }, select: { id: true, plate: true } })
  const plateToVehicle = new Map<string, string>()
  for (const v of vehicles) if (v.plate) plateToVehicle.set(canonicalPlate(v.plate), v.id)

  const drivers = await prisma.driver.findMany({ where: { enterpriseId: ent.id }, select: { id: true, name: true } })
  const byName = new Map<string, string[]>()
  for (const d of drivers) {
    const k = d.name.trim().toLowerCase()
    byName.set(k, [...(byName.get(k) ?? []), d.id])
  }

  const driversRaw = readFileSync(driversFile, 'utf8')
  const rows = parseCsv(driversRaw.charCodeAt(0) === 0xfeff ? driversRaw.slice(1) : driversRaw)
  const header = rows[0] ?? []
  const ni = header.findIndex((h) => h.trim().toLowerCase() === 'nom complet')
  const pi = header.findIndex((h) => h.trim().toLowerCase().includes('plaque'))

  const usedDrivers = new Set<string>()
  const usedVehicles = new Set<string>()
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every((c) => c.trim() === '')) continue
    const name = (row[ni] ?? '').trim()
    const plate = canonicalPlate((row[pi] ?? '').trim())
    if (!name || !plate) continue
    const vehicleId = plateToVehicle.get(plate)
    if (!vehicleId || usedVehicles.has(vehicleId)) continue // plaque absente de la liste officielle ou déjà affectée
    const matches = byName.get(name.toLowerCase()) ?? []
    if (matches.length !== 1) continue // chauffeur introuvable ou ambigu → on saute
    const driverId = matches[0]!
    if (usedDrivers.has(driverId)) continue
    usedDrivers.add(driverId)
    usedVehicles.add(vehicleId)
    await prisma.driverAssignment.create({ data: { driverId, vehicleId } })
    assigned++
  }
}
console.log(`Affectations restaurées : ${assigned}`)

await prisma.$disconnect()
