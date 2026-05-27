import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const vehicleFindMany = vi.fn()
const vehicleFindFirst = vi.fn()
const vehicleCreate = vi.fn()
const vehicleCreateMany = vi.fn()
const vehicleUpdate = vi.fn()
const vehicleDelete = vi.fn()
const enterpriseMemberFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    vehicle: {
      findMany: (...a: unknown[]) => vehicleFindMany(...a),
      findFirst: (...a: unknown[]) => vehicleFindFirst(...a),
      create: (...a: unknown[]) => vehicleCreate(...a),
      createMany: (...a: unknown[]) => vehicleCreateMany(...a),
      update: (...a: unknown[]) => vehicleUpdate(...a),
      delete: (...a: unknown[]) => vehicleDelete(...a),
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

  describe('importVehiclesFromCsv', () => {
    function csvOf(...lines: string[]) { return lines.join('\n') }

    it('rejects an empty file', async () => {
      await expect(importVehiclesFromCsv('e1', 'u1', '')).rejects.toMatchObject({
        statusCode: 400, code: 'CSV_EMPTY',
      })
    })

    it('rejects a header missing required columns', async () => {
      const csv = csvOf('marque,modele', 'Toyota,Hilux')
      await expect(importVehiclesFromCsv('e1', 'u1', csv)).rejects.toMatchObject({
        statusCode: 400, code: 'CSV_HEADER_INVALID',
      })
    })

    it('accepts FR and EN header aliases interchangeably', async () => {
      vehicleCreateMany.mockResolvedValueOnce({ count: 1 })
      const csv = csvOf('brand,model,year', 'Toyota,Hilux,2018')

      const result = await importVehiclesFromCsv('e1', 'u1', csv)

      expect(result.created).toBe(1)
      expect(result.errors).toEqual([])
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
})
