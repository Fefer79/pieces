import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockVendorFindFirst = vi.fn()
const mockVendorFindMany = vi.fn()
const mockVendorCreate = vi.fn()
const mockVendorUpdate = vi.fn()
const mockVendorFindUniqueOrThrow = vi.fn()
const mockVendorCount = vi.fn()
const mockKycCreate = vi.fn()
const mockCatalogItemCreate = vi.fn()
const mockCatalogItemFindMany = vi.fn()
const mockCatalogItemCount = vi.fn()
const mockCatalogItemGroupBy = vi.fn()
const mockTransaction = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    vendor: {
      findFirst: (...args: unknown[]) => mockVendorFindFirst(...args),
      findMany: (...args: unknown[]) => mockVendorFindMany(...args),
      update: (...args: unknown[]) => mockVendorUpdate(...args),
      count: (...args: unknown[]) => mockVendorCount(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockVendorFindUniqueOrThrow(...args),
    },
    catalogItem: {
      create: (...args: unknown[]) => mockCatalogItemCreate(...args),
      findMany: (...args: unknown[]) => mockCatalogItemFindMany(...args),
      count: (...args: unknown[]) => mockCatalogItemCount(...args),
      groupBy: (...args: unknown[]) => mockCatalogItemGroupBy(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}))

const {
  createVendorByLiaison,
  listLiaisonVendors,
  getLiaisonVendor,
  createPartForVendor,
  getLiaisonDashboard,
} = await import('./liaison.service.js')

const validVendorBody = {
  shopName: 'Stand Adjamé',
  contactName: 'Ibrahim Koné',
  phone: '+2250700000000',
  vendorType: 'INFORMAL' as const,
  documentNumber: 'CNI123456789',
  kycType: 'CNI' as const,
  commune: 'Adjamé' as const,
  address: 'Marché central, allée 3',
  lat: 5.36,
  lng: -4.02,
  deliveryZones: ['Adjamé', 'Plateau'],
}

describe('liaison.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        vendor: {
          create: (...args: unknown[]) => mockVendorCreate(...args),
          findUniqueOrThrow: (...args: unknown[]) => mockVendorFindUniqueOrThrow(...args),
        },
        vendorKyc: {
          create: (...args: unknown[]) => mockKycCreate(...args),
        },
      }
      return fn(tx)
    })
  })

  describe('createVendorByLiaison', () => {
    it('creates vendor + kyc and stamps managedByLiaisonId', async () => {
      mockVendorFindFirst.mockResolvedValue(null) // phone free
      mockVendorCreate.mockResolvedValue({ id: 'v1' })
      mockVendorFindUniqueOrThrow.mockResolvedValue({ id: 'v1', shopName: 'Stand Adjamé' })

      await createVendorByLiaison('liaison-1', validVendorBody)

      expect(mockVendorCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shopName: 'Stand Adjamé',
          managedByLiaisonId: 'liaison-1',
          commune: 'Adjamé',
          lat: 5.36,
          lng: -4.02,
          status: 'PENDING_ACTIVATION',
        }),
      })
      expect(mockKycCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vendorId: 'v1',
          kycType: 'CNI',
          isPublic: false,
        }),
      })
    })

    it('rejects mismatched FORMAL+CNI', async () => {
      await expect(
        createVendorByLiaison('liaison-1', {
          ...validVendorBody,
          vendorType: 'FORMAL',
          kycType: 'CNI',
        }),
      ).rejects.toMatchObject({ code: 'LIAISON_VENDOR_INVALID' })
    })

    it('rejects when phone already taken', async () => {
      mockVendorFindFirst.mockResolvedValue({ id: 'existing' })
      await expect(
        createVendorByLiaison('liaison-1', validVendorBody),
      ).rejects.toMatchObject({ code: 'LIAISON_VENDOR_PHONE_TAKEN' })
    })

    it('rejects out-of-range GPS coordinates', async () => {
      await expect(
        createVendorByLiaison('liaison-1', { ...validVendorBody, lat: 999 }),
      ).rejects.toMatchObject({ code: 'LIAISON_VENDOR_INVALID' })
    })
  })

  describe('listLiaisonVendors', () => {
    it('only returns vendors managed by this liaison and adds catalogCount', async () => {
      mockVendorFindMany.mockResolvedValue([
        { id: 'v1', shopName: 'A', _count: { catalogItems: 3 } },
      ])

      const out = await listLiaisonVendors('liaison-1')

      expect(mockVendorFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { managedByLiaisonId: 'liaison-1' },
        }),
      )
      expect(out[0]).toMatchObject({ id: 'v1', catalogCount: 3 })
    })
  })

  describe('getLiaisonVendor', () => {
    it('throws when vendor is not managed by this liaison', async () => {
      mockVendorFindFirst.mockResolvedValue(null)
      await expect(
        getLiaisonVendor('liaison-1', 'v999'),
      ).rejects.toMatchObject({ code: 'LIAISON_VENDOR_NOT_FOUND' })
    })
  })

  describe('createPartForVendor', () => {
    it('rejects if vendor is not managed by this liaison', async () => {
      mockVendorFindFirst.mockResolvedValue(null)
      await expect(
        createPartForVendor('liaison-1', 'v1', {
          name: 'Alternateur',
          condition: 'USED',
        }),
      ).rejects.toMatchObject({ code: 'LIAISON_VENDOR_NOT_FOUND' })
    })

    it('creates part stamped with createdByLiaisonId and PUBLISHED', async () => {
      mockVendorFindFirst.mockResolvedValue({ id: 'v1' })
      mockCatalogItemCreate.mockResolvedValue({ id: 'p1' })

      await createPartForVendor('liaison-1', 'v1', {
        name: 'Alternateur 90A',
        condition: 'USED',
        price: 45000,
      })

      expect(mockCatalogItemCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vendorId: 'v1',
          createdByLiaisonId: 'liaison-1',
          status: 'PUBLISHED',
          aiGenerated: false,
          name: 'Alternateur 90A',
          condition: 'USED',
        }),
        select: expect.any(Object),
      })
    })
  })

  describe('getLiaisonDashboard', () => {
    it('returns aggregated counts scoped to liaison', async () => {
      mockVendorCount
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(3) // active
      mockCatalogItemCount.mockResolvedValueOnce(20)
      mockCatalogItemGroupBy.mockResolvedValueOnce([
        { status: 'PUBLISHED', _count: { status: 18 } },
        { status: 'DRAFT', _count: { status: 2 } },
      ])

      const out = await getLiaisonDashboard('liaison-1')

      expect(out).toEqual({
        vendors: { total: 5, active: 3, pending: 2 },
        parts: { total: 20, published: 18, draft: 2, archived: 0 },
      })
    })
  })
})
