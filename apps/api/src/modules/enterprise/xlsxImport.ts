import ExcelJS from 'exceljs'
import { AppError } from '../../lib/appError.js'

/**
 * Normalise un en-tête : minuscule, apostrophes courbes (’ ‘ ´) → droite ('),
 * sans « * », sans « (…) », partie avant « / ». L'unification des apostrophes
 * permet aux exports Yango (« Numéro d’immatriculation ») de matcher les alias.
 */
export function normalizeHeader(raw: string): string {
  const base = raw
    .toLowerCase()
    .replace(/[’‘´`]/g, "'")
    .replace(/\*/g, '')
    .replace(/\([^)]*\)/g, '')
  const slash = base.indexOf('/')
  return (slash === -1 ? base : base.slice(0, slash)).trim()
}

/**
 * Extrait les lignes (en-tête inclus) de la 1re feuille dont le nom normalisé
 * satisfait `matchSheet` ; à défaut, la 1re feuille du classeur.
 */
export async function extractSheetRows(
  buffer: Buffer,
  matchSheet: (normalizedName: string) => boolean,
): Promise<string[][]> {
  const wb = new ExcelJS.Workbook()
  try {
    // exceljs types lag behind @types/node's generic Buffer — cast is safe.
    await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0])
  } catch {
    throw new AppError('IMPORT_XLSX_INVALID', 400, { message: 'Fichier Excel illisible' })
  }
  const sheet = wb.worksheets.find((s) => matchSheet(normalizeHeader(s.name))) ?? wb.worksheets[0]
  if (!sheet) {
    throw new AppError('IMPORT_EMPTY', 400, { message: 'Classeur Excel vide' })
  }
  const rows: string[][] = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = []
    const count = row.cellCount
    for (let c = 1; c <= count; c++) {
      cells.push(String(row.getCell(c).text ?? '').trim())
    }
    rows.push(cells)
  })
  return rows
}
