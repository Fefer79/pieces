import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()

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
    // Contexte staff chargé par requireCapability sur toute route back-office.
    teamMemberProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    user: {
      upsert: (...args: unknown[]) => mockUserUpsert(...args),
      findUnique: vi.fn().mockResolvedValue({ roles: ['ADMIN'] }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    vendor: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    catalogItem: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    searchSynonym: { findMany: vi.fn() },
    userVehicle: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    escrowTransaction: { create: vi.fn(), findUnique: vi.fn() },
    delivery: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    sellerReview: { create: vi.fn(), findMany: vi.fn(), aggregate: vi.fn() },
    deliveryReview: { create: vi.fn(), findMany: vi.fn(), aggregate: vi.fn() },
    dispute: { create: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    notificationPreference: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}))

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn(), downloadFromR2: vi.fn(), getPublicUrl: vi.fn(),
}))

vi.mock('../../lib/gemini.js', () => ({
  identifyPart: vi.fn(),
}))

vi.mock('../whatsapp/whatsapp.service.js', () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true }),
  sendWhatsAppTemplate: vi.fn().mockResolvedValue({ success: true }),
  getVerifyToken: vi.fn().mockReturnValue('test'),
  parseIncomingMessage: vi.fn().mockReturnValue({ from: null, text: null, imageId: null }),
  verifyWebhookSignature: vi.fn().mockReturnValue(true),
}))

const { buildApp } = await import('../../server.js')

function mockAuth(role = 'ADMIN') {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: 'sup-1', phone: '+2250700000000' } },
    error: null,
  })
  mockUserUpsert.mockResolvedValueOnce({
    id: 'prisma-user-1',
    phone: '+2250700000000',
    roles: [role],
    activeContext: role,
    consentedAt: new Date(),
  })
  return { authorization: 'Bearer test-token' }
}

describe('Admin Routes', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('GET /api/v1/admin/dashboard', () => {
    it('returns 200 with stats for admin', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/dashboard',
        headers: mockAuth('ADMIN'),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data).toHaveProperty('totalUsers')
    })

    it('returns 403 for non-admin', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/dashboard',
        headers: mockAuth('BUYER'),
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('GET /api/v1/admin/users', () => {
    it('returns 200 with user list for admin', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: mockAuth('ADMIN'),
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('GET /api/v1/orders/history (M4: moved from admin)', () => {
    it('returns 200 with user order history', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/orders/history',
        headers: mockAuth('BUYER'),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data).toHaveProperty('orders')
    })

    it('returns 401 without auth', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/orders/history',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/admin/external-imports/list', () => {
    it('returns 200 with paginated list for admin', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/external-imports/list',
        headers: mockAuth('ADMIN'),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data).toHaveProperty('items')
      expect(response.json().data).toHaveProperty('pagination')
    })

    it('returns 403 for non-admin', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/external-imports/list',
        headers: mockAuth('BUYER'),
      })
      expect(response.statusCode).toBe(403)
    })

    it('returns 401 without auth', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/external-imports/list',
      })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/admin/external-imports/stats', () => {
    it('returns 200 with sources array for admin', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/external-imports/stats',
        headers: mockAuth('ADMIN'),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data).toHaveProperty('sources')
    })

    it('returns 403 for non-admin', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/external-imports/stats',
        headers: mockAuth('SELLER'),
      })
      expect(response.statusCode).toBe(403)
    })
  })
  // Le portefeuille vendeurs a quitté `erp:admin` pour le CRM commercial :
  // un COMMERCIAL doit y entrer, sans que ça lui ouvre le reste de l'admin.
  describe('portefeuille vendeurs ouvert au CRM commercial', () => {
    async function mockCommercial() {
      const { prisma } = await import('../../lib/prisma.js')
      vi.mocked(prisma.teamMemberProfile.findUnique).mockResolvedValue({
        id: 'staff-1',
        staffRole: 'COMMERCIAL',
        businessUnits: ['MARKETPLACE'],
        fonction: 'Chargée de compte',
        actif: true,
      } as never)
      return mockAuth('BUYER')
    }

    it('laisse un COMMERCIAL lister les vendeurs', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/vendors/list',
        headers: await mockCommercial(),
      })
      expect(response.statusCode).toBe(200)
    })

    it('laisse un COMMERCIAL exporter les vendeurs', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/export.csv?entity=vendors',
        headers: await mockCommercial(),
      })
      expect(response.statusCode).toBe(200)
    })

    it("refuse au COMMERCIAL l'export des clients, sur la même route", async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/export.csv?entity=clients',
        headers: await mockCommercial(),
      })
      expect(response.statusCode).toBe(403)
    })

    it("refuse au COMMERCIAL l'autocomplétion des imports externes", async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/suggest?entity=external-imports&q=bo',
        headers: await mockCommercial(),
      })
      expect(response.statusCode).toBe(403)
    })

    it('refuse au COMMERCIAL les écrans restés en administration ERP', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/clients/list',
        headers: await mockCommercial(),
      })
      expect(response.statusCode).toBe(403)
    })
  })
})
