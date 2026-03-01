import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()
const mockVendorFindUnique = vi.fn()
const mockVendorCreate = vi.fn()
const mockVendorUpdate = vi.fn()
const mockVendorFindUniqueOrThrow = vi.fn()
const mockKycCreate = vi.fn()
const mockGuaranteeCreateMany = vi.fn()
const mockTransaction = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      upsert: (...args: unknown[]) => mockUserUpsert(...args),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    vendor: {
      findUnique: (...args: unknown[]) => mockVendorFindUnique(...args),
    },
    vendorKyc: {
      create: (...args: unknown[]) => mockKycCreate(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}))

const { buildApp } = await import('../../server.js')

function mockAuthUser(overrides?: Record<string, unknown>) {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: 'supabase-user-123', phone: '+2250700000000' } },
    error: null,
  })
  mockUserUpsert.mockResolvedValueOnce({
    id: 'prisma-user-123',
    phone: '+2250700000000',
    roles: ['SELLER'],
    activeContext: 'SELLER',
    consentedAt: new Date('2026-03-01T12:00:00Z'),
    ...overrides,
  })
}

describe('Vendor Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        vendor: {
          create: (...args: unknown[]) => mockVendorCreate(...args),
          update: (...args: unknown[]) => mockVendorUpdate(...args),
          findUniqueOrThrow: (...args: unknown[]) => mockVendorFindUniqueOrThrow(...args),
        },
        vendorKyc: {
          create: (...args: unknown[]) => mockKycCreate(...args),
        },
        vendorGuaranteeSignature: {
          createMany: (...args: unknown[]) => mockGuaranteeCreateMany(...args),
        },
      }
      return fn(tx)
    })
  })

  describe('POST /api/v1/vendors', () => {
    const validPayload = {
      shopName: 'Pièces Auto Adjamé',
      contactName: 'Ibrahim Koné',
      phone: '+2250700000000',
      vendorType: 'FORMAL',
      documentNumber: 'CI-ABJ-2024-12345',
      kycType: 'RCCM',
    }

    it('returns 201 when vendor created successfully', async () => {
      mockAuthUser()
      mockVendorFindUnique.mockResolvedValueOnce(null) // no existing
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

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vendors',
        headers: { authorization: 'Bearer valid-token' },
        payload: validPayload,
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.data.id).toBe('vendor-1')
      expect(body.data.status).toBe('PENDING_ACTIVATION')
    })

    it('returns 422 for invalid payload', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vendors',
        headers: { authorization: 'Bearer valid-token' },
        payload: { shopName: 'A' }, // too short and missing fields
      })

      expect(response.statusCode).toBe(422)
      expect(response.json().error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 401 without auth token', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vendors',
        payload: validPayload,
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/vendors/me', () => {
    it('returns 200 with vendor profile', async () => {
      mockAuthUser()
      mockVendorFindUnique.mockResolvedValueOnce({
        id: 'vendor-1',
        shopName: 'Test Shop',
        contactName: 'Test Contact',
        phone: '+2250700000000',
        vendorType: 'FORMAL',
        status: 'PENDING_ACTIVATION',
        createdAt: new Date(),
        kyc: {
          id: 'kyc-1',
          kycType: 'RCCM',
          documentNumber: 'RCCM-123',
          isPublic: true,
        },
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vendors/me',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.shopName).toBe('Test Shop')
      expect(body.data.kyc.kycType).toBe('RCCM')
    })

    it('returns 404 when no vendor profile exists', async () => {
      mockAuthUser()
      mockVendorFindUnique.mockResolvedValueOnce(null)

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vendors/me',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(404)
      expect(response.json().error.code).toBe('VENDOR_NOT_FOUND')
    })

    it('returns 401 without auth token', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vendors/me',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/v1/vendors/me/signature', () => {
    it('returns 201 when guarantees signed and vendor activated', async () => {
      mockAuthUser()
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'PENDING_ACTIVATION' })
      mockGuaranteeCreateMany.mockResolvedValueOnce({ count: 2 })
      mockVendorUpdate.mockResolvedValueOnce({})
      mockVendorFindUniqueOrThrow.mockResolvedValueOnce({
        id: 'vendor-1',
        shopName: 'Test Shop',
        status: 'ACTIVE',
        guaranteeSignatures: [
          { id: 'sig-1', guaranteeType: 'RETURN_48H', signedAt: new Date() },
          { id: 'sig-2', guaranteeType: 'WARRANTY_30D', signedAt: new Date() },
        ],
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vendors/me/signature',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.data.status).toBe('ACTIVE')
      expect(body.data.guaranteeSignatures).toHaveLength(2)
    })

    it('returns 409 when vendor already active', async () => {
      mockAuthUser()
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'ACTIVE' })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vendors/me/signature',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(409)
      expect(response.json().error.code).toBe('VENDOR_ALREADY_ACTIVE')
    })

    it('returns 404 when no vendor exists', async () => {
      mockAuthUser()
      mockVendorFindUnique.mockResolvedValueOnce(null)

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vendors/me/signature',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(404)
      expect(response.json().error.code).toBe('VENDOR_NOT_FOUND')
    })

    it('returns 401 without auth token', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vendors/me/signature',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/vendors/me/guarantees', () => {
    it('returns 200 with guarantee status', async () => {
      mockAuthUser()
      mockVendorFindUnique.mockResolvedValueOnce({
        id: 'vendor-1',
        shopName: 'Test Shop',
        vendorType: 'FORMAL',
        status: 'ACTIVE',
        guaranteeSignatures: [
          { id: 'sig-1', guaranteeType: 'RETURN_48H', signedAt: new Date() },
          { id: 'sig-2', guaranteeType: 'WARRANTY_30D', signedAt: new Date() },
        ],
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vendors/me/guarantees',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.allSigned).toBe(true)
      expect(body.data.guarantees).toHaveLength(2)
    })

    it('returns 404 when no vendor exists', async () => {
      mockAuthUser()
      mockVendorFindUnique.mockResolvedValueOnce(null)

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vendors/me/guarantees',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(404)
      expect(response.json().error.code).toBe('VENDOR_NOT_FOUND')
    })

    it('returns 401 without auth token', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vendors/me/guarantees',
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
