import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const driverCreateMany = vi.fn()
const driverFindMany = vi.fn()
const enterpriseMemberFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    driver: {
      createMany: (...a: unknown[]) => driverCreateMany(...a),
      findMany: (...a: unknown[]) => driverFindMany(...a),
    },
    enterpriseMember: {
      findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a),
    },
  },
}))

const { importDriversFromCsv, importDriversFromXlsx } = await import('./driver.service.js')

describe('enterprise/driver.service import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    enterpriseMemberFindUnique.mockResolvedValue({ role: 'OWNER' })
    driverFindMany.mockResolvedValue([]) // aucun numéro déjà présent par défaut
  })

  function csvOf(...lines: string[]) { return lines.join('\n') }

  async function xlsxOf(sheets: Record<string, string[][]>): Promise<Buffer> {
    const wb = new ExcelJS.Workbook()
    for (const [name, rows] of Object.entries(sheets)) {
      const ws = wb.addWorksheet(name)
      rows.forEach((r) => ws.addRow(r))
    }
    return Buffer.from(await wb.xlsx.writeBuffer())
  }

  describe('importDriversFromCsv', () => {
    it('rejects a header missing required columns', async () => {
      await expect(importDriversFromCsv('e1', 'u1', csvOf('nom', 'Koffi'))).rejects.toMatchObject({
        statusCode: 400, code: 'IMPORT_HEADER_INVALID',
      })
    })

    it('creates drivers and normalises the phone format', async () => {
      driverCreateMany.mockResolvedValueOnce({ count: 2 })
      const csv = csvOf(
        'nom,telephone,permis,categorie,embauche',
        'Koffi Yao,+2250700000000,CI-1,B,15/03/2022',
        'Awa Traoré,0555000000,CI-2,C,2023-06-01', // local sans +225
      )

      const result = await importDriversFromCsv('e1', 'u1', csv)

      expect(result.created).toBe(2)
      expect(result.errors).toEqual([])
      const data = (driverCreateMany.mock.calls[0]![0] as { data: Array<{ phone: string; hiredAt: Date }> }).data
      expect(data[0]!.phone).toBe('+2250700000000')
      expect(data[1]!.phone).toBe('+2250555000000')
      expect(data[0]!.hiredAt).toBeInstanceOf(Date)
    })

    it('flags invalid phones and in-file duplicates', async () => {
      driverCreateMany.mockResolvedValueOnce({ count: 1 })
      const csv = csvOf(
        'nom,telephone',
        'Koffi,+2250700000000',
        'Bad,12',                 // téléphone invalide
        'Dup,+2250700000000',     // doublon dans le fichier
      )

      const result = await importDriversFromCsv('e1', 'u1', csv)

      expect(result.created).toBe(1)
      expect(result.errors).toHaveLength(2)
      expect(result.errors.map((e) => e.line)).toEqual([3, 4])
    })

    it('skips numbers already present in the fleet', async () => {
      driverFindMany.mockResolvedValueOnce([{ phone: '+2250700000000' }])
      const csv = csvOf('nom,telephone', 'Koffi,+2250700000000')

      const result = await importDriversFromCsv('e1', 'u1', csv)

      expect(result.created).toBe(0)
      expect(driverCreateMany).not.toHaveBeenCalled()
      expect(result.errors[0]!.message).toMatch(/déjà enregistré/)
    })

    it('requires MANAGER+ role', async () => {
      enterpriseMemberFindUnique.mockResolvedValueOnce({ role: 'MECHANIC' })
      await expect(
        importDriversFromCsv('e1', 'u1', csvOf('nom,telephone', 'Koffi,+2250700000000')),
      ).rejects.toMatchObject({ statusCode: 403, code: 'ENTERPRISE_INSUFFICIENT_ROLE' })
    })
  })

  describe('importDriversFromXlsx', () => {
    it('imports the « Chauffeurs » sheet with template-style headers', async () => {
      driverCreateMany.mockResolvedValueOnce({ count: 1 })
      const buf = await xlsxOf({
        Véhicules: [['Marque *'], ['Toyota']],
        Chauffeurs: [
          ['Nom complet *', 'Téléphone *', 'N° de permis', 'Catégorie permis', "Date d'embauche", 'Notes'],
          ['Koffi Yao', '+2250700000000', 'CI-123456', 'B', '15/03/2022', 'Titulaire'],
        ],
      })

      const result = await importDriversFromXlsx('e1', 'u1', buf)

      expect(result.created).toBe(1)
      expect(result.errors).toEqual([])
      const data = (driverCreateMany.mock.calls[0]![0] as { data: Array<{ name: string; licenseCategory: string }> }).data
      expect(data[0]).toMatchObject({ name: 'Koffi Yao', licenseCategory: 'B' })
    })
  })
})
