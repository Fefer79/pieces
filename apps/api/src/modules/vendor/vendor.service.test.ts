import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockVendorFindUnique = vi.fn()
const mockVendorCreate = vi.fn()
const mockVendorFindUniqueOrThrow = vi.fn()
const mockKycCreate = vi.fn()
const mockTransaction = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    vendor: {
      findUnique: (...args: unknown[]) => mockVendorFindUnique(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}))

const { createVendor, getMyVendor } = await import('./vendor.service.js')

describe('vendor.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default $transaction mock: execute the callback with mock tx
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

  describe('createVendor', () => {
    const validFormalBody = {
      shopName: 'Pièces Auto Adjamé',
      contactName: 'Ibrahim Koné',
      phone: '+2250700000000',
      vendorType: 'FORMAL',
      documentNumber: 'CI-ABJ-2024-12345',
      kycType: 'RCCM',
    }

    const validInformalBody = {
      shopName: 'Stand Ibrahim',
      contactName: 'Ibrahim Touré',
      phone: '+2250500000000',
      vendorType: 'INFORMAL',
      documentNumber: 'CNI123456789',
      kycType: 'CNI',
    }

    it('creates a formal vendor with RCCM', async () => {
      mockVendorFindUnique.mockResolvedValueOnce(null) // no existing vendor
      mockVendorCreate.mockResolvedValueOnce({ id: 'vendor-1' })
      mockKycCreate.mockResolvedValueOnce({})
      mockVendorFindUniqueOrThrow.mockResolvedValueOnce({
        id: 'vendor-1',
        shopName: 'Pièces Auto Adjamé',
        contactName: 'Ibrahim Koné',
        phone: '+2250700000000',
        vendorType: 'FORMAL',
        status: 'PENDING_ACTIVATION',
        createdAt: new Date(),
        kyc: {
          id: 'kyc-1',
          kycType: 'RCCM',
          documentNumber: 'CI-ABJ-2024-12345',
          isPublic: true,
        },
      })

      const result = await createVendor('user-1', validFormalBody)

      expect(result.id).toBe('vendor-1')
      expect(result.vendorType).toBe('FORMAL')
      expect(result.status).toBe('PENDING_ACTIVATION')
      expect(result.kyc.kycType).toBe('RCCM')
      expect(result.kyc.isPublic).toBe(true)
      expect(mockVendorCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            vendorType: 'FORMAL',
            status: 'PENDING_ACTIVATION',
          }),
        }),
      )
      expect(mockKycCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kycType: 'RCCM',
            isPublic: true,
          }),
        }),
      )
    })

    it('creates an informal vendor with CNI', async () => {
      mockVendorFindUnique.mockResolvedValueOnce(null)
      mockVendorCreate.mockResolvedValueOnce({ id: 'vendor-2' })
      mockKycCreate.mockResolvedValueOnce({})
      mockVendorFindUniqueOrThrow.mockResolvedValueOnce({
        id: 'vendor-2',
        shopName: 'Stand Ibrahim',
        vendorType: 'INFORMAL',
        status: 'PENDING_ACTIVATION',
        kyc: { kycType: 'CNI', isPublic: false },
      })

      const result = await createVendor('user-2', validInformalBody)

      expect(result.vendorType).toBe('INFORMAL')
      expect(result.kyc.kycType).toBe('CNI')
      expect(result.kyc.isPublic).toBe(false)
    })

    it('throws VENDOR_ALREADY_EXISTS if vendor profile exists', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'existing-vendor' })

      await expect(createVendor('user-1', validFormalBody)).rejects.toMatchObject({
        code: 'VENDOR_ALREADY_EXISTS',
        statusCode: 409,
      })
    })

    it('throws VENDOR_INVALID_DATA for mismatched vendorType/kycType', async () => {
      const invalidBody = { ...validFormalBody, kycType: 'CNI' } // FORMAL + CNI = invalid

      await expect(createVendor('user-1', invalidBody)).rejects.toMatchObject({
        code: 'VENDOR_INVALID_DATA',
        statusCode: 422,
      })
    })

    it('throws VENDOR_INVALID_DATA for missing required fields', async () => {
      await expect(createVendor('user-1', { shopName: 'A' })).rejects.toMatchObject({
        code: 'VENDOR_INVALID_DATA',
        statusCode: 422,
      })
    })
  })

  describe('getMyVendor', () => {
    it('returns vendor profile with KYC', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({
        id: 'vendor-1',
        shopName: 'Test Shop',
        kyc: { kycType: 'RCCM', isPublic: true },
      })

      const result = await getMyVendor('user-1')

      expect(result.id).toBe('vendor-1')
      expect(result.kyc.kycType).toBe('RCCM')
    })

    it('throws VENDOR_NOT_FOUND when no vendor exists', async () => {
      mockVendorFindUnique.mockResolvedValueOnce(null)

      await expect(getMyVendor('user-1')).rejects.toMatchObject({
        code: 'VENDOR_NOT_FOUND',
        statusCode: 404,
      })
    })
  })
})
