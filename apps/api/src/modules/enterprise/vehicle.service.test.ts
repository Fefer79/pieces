import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const vehicleFindMany = vi.fn()
const vehicleFindFirst = vi.fn()
const vehicleCreate = vi.fn()
const vehicleCreateMany = vi.fn()
const vehicleCreateManyAndReturn = vi.fn()
const vehicleUpdate = vi.fn()
const vehicleDelete = vi.fn()
const enterpriseMemberFindUnique = vi.fn()
const driverFindMany = vi.fn()
const driverAssignmentUpdateMany = vi.fn()
const driverAssignmentCreate = vi.fn()
const orderFindMany = vi.fn()
const orderGroupBy = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    vehicle: {
      findMany: (...a: unknown[]) => vehicleFindMany(...a),
      findFirst: (...a: unknown[]) => vehicleFindFirst(...a),
      create: (...a: unknown[]) => vehicleCreate(...a),
      createMany: (...a: unknown[]) => vehicleCreateMany(...a),
      createManyAndReturn: (...a: unknown[]) => vehicleCreateManyAndReturn(...a),
      update: (...a: unknown[]) => vehicleUpdate(...a),
      delete: (...a: unknown[]) => vehicleDelete(...a),
    },
    driver: {
      findMany: (...a: unknown[]) => driverFindMany(...a),
    },
    driverAssignment: {
      updateMany: (...a: unknown[]) => driverAssignmentUpdateMany(...a),
      create: (...a: unknown[]) => driverAssignmentCreate(...a),
    },
    order: {
      findMany: (...a: unknown[]) => orderFindMany(...a),
      groupBy: (...a: unknown[]) => orderGroupBy(...a),
    },
    enterpriseMember: {
      findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a),
    },
  },
}))

const {
  listEnterpriseVehicles,
  createEnterpriseVehicle,
  updateMileage,
  importVehiclesFromCsv,
  importVehiclesFromXlsx,
  getVehicleAnalytics,
} = await import('./vehicle.service.js')

// Assume the caller is an OWNER unless overridden in a test
function asOwner() {
  enterpriseMemberFindUnique.mockResolvedValue({ role: 'OWNER' })
}

describe('enterprise/vehicle.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    asOwner()
  })

  describe('listEnterpriseVehicles', () => {
    it('filters by groupName and usageType when provided', async () => {
      vehicleFindMany.mockResolvedValueOnce([])

      await listEnterpriseVehicles('e1', 'u1', { groupName: 'Yopougon', usageType: 'CHANTIER' })

      expect(vehicleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { enterpriseId: 'e1', groupName: 'Yopougon', usageType: 'CHANTIER' },
        }),
      )
    })
  })

  describe('createEnterpriseVehicle', () => {
    it('stamps mileageUpdatedAt when mileage is provided', async () => {
      vehicleCreate.mockResolvedValueOnce({ id: 'v1' })

      await createEnterpriseVehicle('e1', 'u1', {
        brand: 'Toyota', model: 'Hilux', year: 2018, mileage: 100000,
      })

      const callArg = vehicleCreate.mock.calls[0]![0] as { data: { mileageUpdatedAt: Date | null } }
      expect(callArg.data.mileageUpdatedAt).toBeInstanceOf(Date)
    })

    it('leaves mileageUpdatedAt null when no mileage is provided', async () => {
      vehicleCreate.mockResolvedValueOnce({ id: 'v1' })

      await createEnterpriseVehicle('e1', 'u1', { brand: 'Toyota', model: 'Hilux', year: 2018 })

      const callArg = vehicleCreate.mock.calls[0]![0] as { data: { mileageUpdatedAt: Date | null } }
      expect(callArg.data.mileageUpdatedAt).toBeNull()
    })
  })

  describe('updateMileage', () => {
    it('updates mileage and refreshes mileageUpdatedAt', async () => {
      vehicleFindFirst.mockResolvedValueOnce({ id: 'v1' })
      vehicleUpdate.mockResolvedValueOnce({ id: 'v1', mileage: 50000 })

      await updateMileage('e1', 'u1', 'v1', 50000)

      const callArg = vehicleUpdate.mock.calls[0]![0] as { data: { mileage: number; mileageUpdatedAt: Date } }
      expect(callArg.data.mileage).toBe(50000)
      expect(callArg.data.mileageUpdatedAt).toBeInstanceOf(Date)
    })
  })

  describe('getVehicleAnalytics', () => {
    it('aggregates spend by category and computes cost per km', async () => {
      vehicleFindFirst.mockResolvedValueOnce({
        id: 'v1',
        brand: 'Toyota',
        model: 'Hilux',
        year: 2018,
        mileage: 100_000,
      })
      orderFindMany.mockResolvedValueOnce([
        {
          id: 'o1',
          paidAt: new Date(),
          createdAt: new Date(),
          totalAmount: 30_000,
          items: [
            { id: 'i1', name: 'Plaquettes', category: 'Freinage', priceSnapshot: 10_000, quantity: 2, vendorShopName: 'X', imageThumbUrl: null, createdAt: new Date() },
            { id: 'i2', name: 'Filtre', category: 'Filtration', priceSnapshot: 5_000, quantity: 2, vendorShopName: 'X', imageThumbUrl: null, createdAt: new Date() },
          ],
        },
      ])
      // no peers
      vehicleFindMany.mockResolvedValueOnce([])

      const res = await getVehicleAnalytics('e1', 'u1', 'v1')

      expect(res.totalSpend).toBe(30_000)
      expect(res.spendByCategory).toEqual([
        { category: 'Freinage', total: 20_000 },
        { category: 'Filtration', total: 10_000 },
      ])
      // 30000 / 100000 = 0.3
      expect(res.costPerKm).toBe(0.3)
    })

    it('returns null cost per km when mileage is unknown', async () => {
      vehicleFindFirst.mockResolvedValueOnce({
        id: 'v1',
        brand: 'Toyota',
        model: 'Hilux',
        year: 2018,
        mileage: null,
      })
      orderFindMany.mockResolvedValueOnce([])
      vehicleFindMany.mockResolvedValueOnce([])

      const res = await getVehicleAnalytics('e1', 'u1', 'v1')

      expect(res.costPerKm).toBeNull()
      expect(res.spendByCategory).toEqual([])
    })
  })

  describe('importVehiclesFromCsv', () => {
    function csvOf(...lines: string[]) { return lines.join('\n') }

    it('rejects an empty file', async () => {
      await expect(importVehiclesFromCsv('e1', 'u1', '')).rejects.toMatchObject({
        statusCode: 400, code: 'IMPORT_EMPTY',
      })
    })

    it('rejects a header missing required columns', async () => {
      const csv = csvOf('marque,modele', 'Toyota,Hilux')
      await expect(importVehiclesFromCsv('e1', 'u1', csv)).rejects.toMatchObject({
        statusCode: 400, code: 'IMPORT_HEADER_INVALID',
      })
    })

    it('accepts FR and EN header aliases interchangeably', async () => {
      vehicleCreateMany.mockResolvedValueOnce({ count: 1 })
      const csv = csvOf('brand,model,year', 'Toyota,Hilux,2018')

      const result = await importVehiclesFromCsv('e1', 'u1', csv)

      expect(result.created).toBe(1)
      expect(result.errors).toEqual([])
    })

    it('ingère nativement l’export Yango « liste voitures » (apostrophe courbe, « ; », colonnes en plus)', async () => {
      vehicleCreateMany.mockResolvedValueOnce({ count: 2 })
      // En-tête réel de summary_cars_list.csv : « Numéro d’immatriculation » (U+2019).
      const csv = csvOf(
        'ID;Statut;Nom de code;Marque;Modèle;Année;Numéro d’immatriculation;Couleur;NIV;Certificat;Date de création;Voiture de parc',
        'id1;Actif;1738WWCI01;Suzuki;Dzire;2026;1738WWCI01;white;;;2026-02-28T19:43:30Z;Yes',
        'id1;Actif;1696WWCI01;Suzuki;S-Presso;2026;1696WWCI01;white;;;2026-02-28T19:44:34Z;Yes',
      )

      const result = await importVehiclesFromCsv('e1', 'u1', csv)

      expect(result.created).toBe(2)
      expect(result.errors).toEqual([])
      const callArg = vehicleCreateMany.mock.calls[0]![0] as {
        data: Array<{ brand: string; model: string; year: number; plate: string }>
      }
      expect(callArg.data[0]).toMatchObject({ brand: 'Suzuki', model: 'Dzire', year: 2026, plate: '1738WWCI01' })
      expect(callArg.data[1]).toMatchObject({ brand: 'Suzuki', model: 'S-Presso', year: 2026, plate: '1696WWCI01' })
    })

    it('parses a realistic Ivorian fleet row with all optional fields', async () => {
      vehicleCreateMany.mockResolvedValueOnce({ count: 1 })
      const csv = csvOf(
        'marque,modele,annee,immatriculation,motorisation,kilometrage,usage,groupe',
        'Toyota,Hilux,2018,AB-1234-CI,2.4L Diesel,145000,CHANTIER,Yopougon',
      )

      const result = await importVehiclesFromCsv('e1', 'u1', csv)

      expect(result.created).toBe(1)
      const callArg = vehicleCreateMany.mock.calls[0]![0] as { data: Array<{ plate: string; usageType: string; mileage: number; mileageUpdatedAt: Date }> }
      expect(callArg.data[0]).toMatchObject({
        plate: 'AB-1234-CI',
        usageType: 'CHANTIER',
        mileage: 145000,
      })
      expect(callArg.data[0]!.mileageUpdatedAt).toBeInstanceOf(Date)
    })

    it('skips invalid rows but keeps valid ones, reporting line errors', async () => {
      vehicleCreateMany.mockResolvedValueOnce({ count: 1 })
      const csv = csvOf(
        'marque,modele,annee,usage',
        'Toyota,Hilux,2018,CHANTIER',          // line 2 — OK
        'Renault,Master,abcd,LIVRAISON',       // line 3 — bad year
        ',Master,2020,LIVRAISON',              // line 4 — missing brand
        'Peugeot,Partner,2019,DRIFT',          // line 5 — bad usage enum
      )

      const result = await importVehiclesFromCsv('e1', 'u1', csv)

      expect(result.created).toBe(1)
      expect(result.errors).toHaveLength(3)
      expect(result.errors.map((e: { line: number }) => e.line)).toEqual([3, 4, 5])
    })

    it('rejects an invalid VIN format', async () => {
      const csv = csvOf(
        'marque,modele,annee,vin',
        'Toyota,Hilux,2018,not-a-vin',
      )
      const result = await importVehiclesFromCsv('e1', 'u1', csv)
      expect(result.created).toBe(0)
      expect(result.errors[0]!.message).toMatch(/VIN invalide/)
      expect(vehicleCreateMany).not.toHaveBeenCalled()
    })

    it('handles quoted CSV cells containing commas', async () => {
      vehicleCreateMany.mockResolvedValueOnce({ count: 1 })
      const csv = csvOf(
        'marque,modele,annee,groupe',
        '"Mercedes-Benz","Sprinter, long",2020,"Treichville, Centre"',
      )

      const result = await importVehiclesFromCsv('e1', 'u1', csv)

      expect(result.created).toBe(1)
      const callArg = vehicleCreateMany.mock.calls[0]![0] as { data: Array<{ brand: string; model: string; groupName: string }> }
      expect(callArg.data[0]).toMatchObject({
        brand: 'Mercedes-Benz',
        model: 'Sprinter, long',
        groupName: 'Treichville, Centre',
      })
    })

    it('ignores fully-blank lines between data rows', async () => {
      vehicleCreateMany.mockResolvedValueOnce({ count: 2 })
      const csv = csvOf(
        'marque,modele,annee',
        'Toyota,Hilux,2018',
        '',
        ',,',
        'Renault,Master,2020',
      )

      const result = await importVehiclesFromCsv('e1', 'u1', csv)

      expect(result.created).toBe(2)
      expect(result.errors).toEqual([])
    })

    it('requires MANAGER+ role', async () => {
      enterpriseMemberFindUnique.mockResolvedValueOnce({ role: 'MECHANIC' })
      const csv = csvOf('marque,modele,annee', 'Toyota,Hilux,2018')
      await expect(importVehiclesFromCsv('e1', 'u1', csv)).rejects.toMatchObject({
        statusCode: 403,
        code: 'ENTERPRISE_INSUFFICIENT_ROLE',
      })
    })
  })

  describe('importVehiclesFromXlsx', () => {
    // Builds an .xlsx buffer; `sheets` maps sheet name → rows (incl. header).
    async function xlsxOf(sheets: Record<string, string[][]>): Promise<Buffer> {
      const wb = new ExcelJS.Workbook()
      for (const [name, rows] of Object.entries(sheets)) {
        const ws = wb.addWorksheet(name)
        rows.forEach((r) => ws.addRow(r))
      }
      return Buffer.from(await wb.xlsx.writeBuffer())
    }

    it('imports the « Véhicules » sheet with template-style headers', async () => {
      vehicleCreateMany.mockResolvedValueOnce({ count: 2 })
      const buf = await xlsxOf({
        'Mode d\'emploi': [['ignorer']],
        Entreprise: [['Nom', 'Transports Yopougon']],
        Véhicules: [
          ['Marque *', 'Modèle *', 'Année *', 'Immatriculation', "Type d'usage", 'Groupe / Site'],
          ['Toyota', 'Hilux', '2018', 'AB-1234-CI', 'CHANTIER', 'Yopougon'],
          ['Renault', 'Master', '2020', 'CD-5678-CI', 'LIVRAISON', 'Treichville'],
        ],
      })

      const result = await importVehiclesFromXlsx('e1', 'u1', buf)

      expect(result.created).toBe(2)
      expect(result.errors).toEqual([])
      const callArg = vehicleCreateMany.mock.calls[0]![0] as {
        data: Array<{ brand: string; usageType: string; groupName: string }>
      }
      expect(callArg.data[0]).toMatchObject({
        brand: 'Toyota', usageType: 'CHANTIER', groupName: 'Yopougon',
      })
    })

    it('reports row errors and skips invalid rows', async () => {
      vehicleCreateMany.mockResolvedValueOnce({ count: 1 })
      const buf = await xlsxOf({
        Véhicules: [
          ['Marque *', 'Modèle *', 'Année *', "Type d'usage"],
          ['Toyota', 'Hilux', '2018', 'CHANTIER'],   // row 2 — OK
          ['Peugeot', 'Partner', '2019', 'DRIFT'],   // row 3 — bad usage enum
        ],
      })

      const result = await importVehiclesFromXlsx('e1', 'u1', buf)

      expect(result.created).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]!.line).toBe(3)
    })

    it('rejects a sheet missing required columns', async () => {
      const buf = await xlsxOf({ Véhicules: [['Marque *', 'Modèle *'], ['Toyota', 'Hilux']] })
      await expect(importVehiclesFromXlsx('e1', 'u1', buf)).rejects.toMatchObject({
        statusCode: 400, code: 'IMPORT_HEADER_INVALID',
      })
    })
  })

  describe('driver assignment via the « Chauffeur attitré » column', () => {
    function csvOf(...lines: string[]) { return lines.join('\n') }

    it('assigns vehicles to matching drivers (case-insensitive)', async () => {
      vehicleCreateManyAndReturn.mockResolvedValueOnce([{ id: 'v1' }, { id: 'v2' }])
      driverFindMany.mockResolvedValueOnce([
        { id: 'd1', name: 'Koffi Yao' },
        { id: 'd2', name: 'Awa Traoré' },
      ])
      const csv = csvOf(
        'marque,modele,annee,chauffeur',
        'Toyota,Hilux,2018,koffi yao',
        'Renault,Master,2020,Awa Traoré',
      )

      const result = await importVehiclesFromCsv('e1', 'u1', csv)

      expect(result.created).toBe(2)
      expect(result.assigned).toBe(2)
      expect(result.errors).toEqual([])
      expect(vehicleCreateMany).not.toHaveBeenCalled()
      expect(driverAssignmentCreate).toHaveBeenCalledWith({ data: { driverId: 'd1', vehicleId: 'v1' } })
      expect(driverAssignmentCreate).toHaveBeenCalledWith({ data: { driverId: 'd2', vehicleId: 'v2' } })
      // L'affectation active précédente est clôturée d'abord.
      expect(driverAssignmentUpdateMany).toHaveBeenCalledTimes(2)
    })

    it('reports an unknown driver name but still creates the vehicle', async () => {
      vehicleCreateManyAndReturn.mockResolvedValueOnce([{ id: 'v1' }])
      driverFindMany.mockResolvedValueOnce([{ id: 'd1', name: 'Koffi Yao' }])
      const csv = csvOf('marque,modele,annee,chauffeur', 'Toyota,Hilux,2018,Inconnu')

      const result = await importVehiclesFromCsv('e1', 'u1', csv)

      expect(result.created).toBe(1)
      expect(result.assigned).toBe(0)
      expect(result.errors[0]!.message).toMatch(/chauffeur introuvable/)
      expect(driverAssignmentCreate).not.toHaveBeenCalled()
    })

    it('uses bulk createMany when no driver column is filled', async () => {
      vehicleCreateMany.mockResolvedValueOnce({ count: 1 })
      const csv = csvOf('marque,modele,annee,chauffeur', 'Toyota,Hilux,2018,')

      const result = await importVehiclesFromCsv('e1', 'u1', csv)

      expect(result.created).toBe(1)
      expect(vehicleCreateManyAndReturn).not.toHaveBeenCalled()
      expect(driverFindMany).not.toHaveBeenCalled()
    })
  })
})
