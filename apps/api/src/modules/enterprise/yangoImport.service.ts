import { AppError } from '../../lib/appError.js'
import { normalizeHeader, extractSheetRows } from './xlsxImport.js'
import { parseCsv, importVehicleRows } from './vehicle.service.js'
import { importDriverRows } from './driver.service.js'

// --- Import « export Yango » (un seul fichier) ---------------------------
//
// L'export conducteurs de Yango (« contractor_profiles … ») mélange, sur une
// même ligne, le chauffeur ET le véhicule qu'il conduit. Ce module accepte ce
// format brut tel quel : un seul téléversement crée les chauffeurs, les
// véhicules (dédoublonnés par plaque) et les affecte automatiquement.
//
// On réutilise les validateurs canoniques (importDriverRows / importVehicleRows)
// en reconstruisant, à partir des colonnes Yango, les lignes attendues par
// chacun. La validation (téléphone, dédoublonnage, affectation par nom) reste
// donc l'unique source de vérité.

/** Année par défaut des véhicules : l'export Yango ne porte pas l'année. */
export const YANGO_DEFAULT_VEHICLE_YEAR = 2025

// En-têtes Yango (normalisés via normalizeHeader → minuscule, sans « (…) »).
const COL = {
  name: 'nom complet',
  phone: 'numéro de téléphone',
  license: 'permis de conduire',
  vehicle: 'véhicule',
  plate: "numéro de la plaque d'immatriculation du véhicule",
  startDate: 'date de début',
  addedDate: "date d'ajout",
  status: 'statut',
} as const

type YangoResult = {
  drivers: { created: number; errors: { line: number; message: string }[] }
  vehicles: { created: number; assigned?: number; errors: { line: number; message: string }[] }
}

export async function importYangoFromCsv(
  enterpriseId: string,
  userId: string,
  csv: string,
): Promise<YangoResult> {
  // Yango exporte en UTF-8 avec BOM et séparateur « ; » — parseCsv gère « ; ».
  const clean = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv
  return importYangoRows(enterpriseId, userId, parseCsv(clean))
}

export async function importYangoFromXlsx(
  enterpriseId: string,
  userId: string,
  buffer: Buffer,
): Promise<YangoResult> {
  // Un export Yango converti en .xlsx : on prend la 1re feuille.
  const rows = await extractSheetRows(buffer, () => true)
  return importYangoRows(enterpriseId, userId, rows)
}

/** Reconnaît un export Yango à la présence de ses colonnes signature. */
export function isYangoExport(headerRow: string[]): boolean {
  const headers = new Set(headerRow.map((h) => normalizeHeader(h)))
  return headers.has(COL.name) && headers.has(COL.phone) && (headers.has(COL.plate) || headers.has(COL.vehicle))
}

/** Coupe « Suzuki Dzire » → { brand: 'Suzuki', model: 'Dzire' }. */
function splitVehicle(raw: string): { brand: string; model: string } | null {
  const v = raw.trim()
  if (!v) return null
  const sp = v.indexOf(' ')
  if (sp === -1) return { brand: v, model: v } // un seul mot : marque = modèle
  return { brand: v.slice(0, sp).trim(), model: v.slice(sp + 1).trim() }
}

/** Plaque canonique : majuscules, sans espace ni tiret (« 1749-WW-CI-01 » → « 1749WWCI01 »). */
function canonicalPlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

async function importYangoRows(
  enterpriseId: string,
  userId: string,
  rows: string[][],
): Promise<YangoResult> {
  const [headerRow] = rows
  if (!headerRow) {
    throw new AppError('IMPORT_EMPTY', 400, { message: 'Fichier Yango vide' })
  }
  if (!isYangoExport(headerRow)) {
    throw new AppError('IMPORT_HEADER_INVALID', 400, {
      message: 'Format Yango non reconnu : colonnes « Nom complet » et « Numéro de téléphone » requises',
    })
  }

  // Index des colonnes Yango d'intérêt.
  const idx: Record<string, number> = {}
  headerRow.forEach((h, i) => {
    const norm = normalizeHeader(h)
    for (const [, col] of Object.entries(COL)) {
      if (norm === col) idx[col] = i
    }
  })
  const cell = (row: string[], col: string) => {
    const i = idx[col]
    return i == null ? '' : (row[i] ?? '').trim()
  }

  // --- Lignes canoniques chauffeurs (1 ligne Yango = 1 chauffeur) --------
  const driverRows: string[][] = [['nom', 'telephone', 'permis', 'embauche']]
  // --- Véhicules : dédoublonnés par plaque, affectés au 1er chauffeur ----
  const vehicleRows: string[][] = [['marque', 'modele', 'annee', 'immatriculation', 'usage', 'chauffeur']]
  const seenPlates = new Set<string>()

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every((c) => c.trim() === '')) continue
    const name = cell(row, COL.name)
    const phone = cell(row, COL.phone)
    const hiredAt = cell(row, COL.startDate) || cell(row, COL.addedDate)
    driverRows.push([name, phone, cell(row, COL.license), hiredAt])

    const plateRaw = cell(row, COL.plate)
    const split = splitVehicle(cell(row, COL.vehicle))
    if (!plateRaw || !split) continue
    const plate = canonicalPlate(plateRaw)
    if (seenPlates.has(plate)) continue // plaque partagée : un seul véhicule
    seenPlates.add(plate)
    vehicleRows.push([split.brand, split.model, String(YANGO_DEFAULT_VEHICLE_YEAR), plate, 'TRANSPORT', name])
  }

  // Chauffeurs d'abord (l'affectation véhicule les résout par nom).
  const drivers = await importDriverRows(enterpriseId, userId, driverRows, 'Aucun chauffeur dans le fichier Yango')
  const vehicles =
    vehicleRows.length > 1
      ? await importVehicleRows(enterpriseId, userId, vehicleRows, 'Aucun véhicule dans le fichier Yango')
      : { created: 0, assigned: 0, errors: [] }

  return { drivers, vehicles }
}
