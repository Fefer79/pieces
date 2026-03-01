import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')
vi.stubEnv('WHATSAPP_TOKEN', 'test-wa-token')
vi.stubEnv('WHATSAPP_PHONE_ID', 'test-phone-id')
vi.stubEnv('WHATSAPP_VERIFY_TOKEN', 'pieces-verify-token')

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
    user: {
      upsert: (...args: unknown[]) => mockUserUpsert(...args),
      findUnique: vi.fn().mockResolvedValue({ id: 'u1', phone: '+2250700000000', roles: ['MECHANIC'], vehicles: [] }),
      update: vi.fn(),
    },
    vendor: { findUnique: vi.fn() },
    catalogItem: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    searchSynonym: { findMany: vi.fn().mockResolvedValue([]) },
    userVehicle: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    order: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
    escrowTransaction: { create: vi.fn(), findUnique: vi.fn() },
    delivery: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    sellerReview: { create: vi.fn(), findMany: vi.fn(), aggregate: vi.fn() },
    deliveryReview: { create: vi.fn(), findMany: vi.fn(), aggregate: vi.fn() },
    dispute: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    notificationPreference: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}))

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn(), downloadFromR2: vi.fn(), getPublicUrl: vi.fn(),
}))

vi.mock('../../lib/gemini.js', () => ({
  identifyPart: vi.fn(),
}))

const mockSendMessage = vi.fn().mockResolvedValue({ success: true })
const mockVerifySignature = vi.fn().mockReturnValue(true)
const mockFindUser = vi.fn().mockResolvedValue(null)
const mockDownloadMedia = vi.fn().mockResolvedValue(Buffer.from('fake-image'))
const mockGetSession = vi.fn().mockReturnValue(null)
const mockSetSession = vi.fn()
const mockClearSession = vi.fn()

vi.mock('./whatsapp.service.js', async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>
  return {
    ...original,
    sendWhatsAppMessage: (...args: unknown[]) => mockSendMessage(...args),
    verifyWebhookSignature: (...args: unknown[]) => mockVerifySignature(...args),
    findUserByWhatsApp: (...args: unknown[]) => mockFindUser(...args),
    downloadWhatsAppMedia: (...args: unknown[]) => mockDownloadMedia(...args),
    getSession: (...args: unknown[]) => mockGetSession(...args),
    setSession: (...args: unknown[]) => mockSetSession(...args),
    clearSession: (...args: unknown[]) => mockClearSession(...args),
  }
})

const mockSearchParts = vi.fn().mockResolvedValue({ query: 'test', items: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 0 } })
vi.mock('../browse/browse.service.js', () => ({
  searchParts: (...args: unknown[]) => mockSearchParts(...args),
}))

const mockIdentifyFromPhoto = vi.fn().mockResolvedValue({ status: 'failed', identification: null, candidates: [], matchingParts: [] })
const mockSearchByCategory = vi.fn().mockResolvedValue([])
vi.mock('../vision/vision.service.js', () => ({
  identifyFromPhoto: (...args: unknown[]) => mockIdentifyFromPhoto(...args),
  searchByCategory: (...args: unknown[]) => mockSearchByCategory(...args),
}))

const mockCreateOrder = vi.fn().mockResolvedValue({ id: 'ord1', shareToken: 'abc123', items: [] })
vi.mock('../order/order.service.js', () => ({
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
}))

const { buildApp } = await import('../../server.js')

function makePayload(from: string, type: 'text' | 'image', content: string) {
  if (type === 'text') {
    return { entry: [{ changes: [{ value: { messages: [{ from, type: 'text', text: { body: content } }] } }] }] }
  }
  return { entry: [{ changes: [{ value: { messages: [{ from, type: 'image', image: { id: content } }] } }] }] }
}

describe('WhatsApp Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifySignature.mockReturnValue(true)
    mockFindUser.mockResolvedValue(null)
    mockGetSession.mockReturnValue(null)
  })

  describe('GET /api/v1/whatsapp/webhook', () => {
    it('returns challenge on valid verification', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/whatsapp/webhook',
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'pieces-verify-token',
          'hub.challenge': 'test-challenge-123',
        },
      })

      expect(response.statusCode).toBe(200)
      expect(response.body).toBe('test-challenge-123')
    })

    it('returns 403 on invalid verify token', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/whatsapp/webhook',
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'test',
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('POST /api/v1/whatsapp/webhook', () => {
    it('processes text "aide" command', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: makePayload('2250700000000', 'text', 'aide'),
      })

      expect(response.statusCode).toBe(200)
      expect(mockSendMessage).toHaveBeenCalledOnce()
      expect(mockSendMessage.mock.calls[0][1]).toContain('Bienvenue')
    })

    it('rejects invalid HMAC signature', async () => {
      mockVerifySignature.mockReturnValue(false)

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: { entry: [] },
      })

      expect(response.statusCode).toBe(401)
    })

    it('returns 200 and ignores empty message', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: { entry: [] },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().status).toBe('ignored')
    })

    // AC1: User lookup
    it('looks up user by WhatsApp number', async () => {
      const app = buildApp()
      await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: makePayload('2250700000000', 'text', 'aide'),
      })

      expect(mockFindUser).toHaveBeenCalledWith('2250700000000')
    })

    // AC2: Real search
    it('performs real catalog search on "recherche" command', async () => {
      mockSearchParts.mockResolvedValueOnce({
        query: 'plaquettes',
        items: [
          { id: '1', name: 'Plaquettes frein', category: 'Freinage', price: 5000, imageThumbUrl: null, vendor: { id: 'v1', shopName: 'Auto' } },
        ],
        pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: makePayload('2250700000000', 'text', 'recherche plaquettes'),
      })

      expect(response.statusCode).toBe(200)
      expect(mockSearchParts).toHaveBeenCalledWith('plaquettes', { limit: 5 })
      expect(mockSendMessage).toHaveBeenCalled()
      const sentMessage = mockSendMessage.mock.calls[0][1] as string
      expect(sentMessage).toContain('Plaquettes frein')
      expect(sentMessage).toMatch(/5.000 FCFA/)
    })

    it('shows no-results message when search returns empty', async () => {
      mockSearchParts.mockResolvedValueOnce({
        query: 'xyz',
        items: [],
        pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
      })

      const app = buildApp()
      await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: makePayload('2250700000000', 'text', 'recherche xyz'),
      })

      const sentMessage = mockSendMessage.mock.calls[0][1] as string
      expect(sentMessage).toContain('Aucun résultat')
    })

    // AC3: Photo AI identification
    it('processes image with real AI identification', async () => {
      mockIdentifyFromPhoto.mockResolvedValueOnce({
        status: 'identified',
        identification: { name: 'Filtre huile', category: 'Filtration', confidence: 0.85, oemReference: null, vehicleCompatibility: null, suggestedPrice: null },
        candidates: [],
        matchingParts: [
          { id: '1', name: 'Filtre huile Toyota', category: 'Filtration', price: 4500, imageThumbUrl: null, vendor: { id: 'v1', shopName: 'Auto Parts' } },
        ],
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: makePayload('2250700000000', 'image', 'img-123'),
      })

      expect(response.statusCode).toBe(200)
      expect(mockDownloadMedia).toHaveBeenCalledWith('img-123')
      expect(mockIdentifyFromPhoto).toHaveBeenCalled()
      // First message: "Photo reçue", second: results
      expect(mockSendMessage).toHaveBeenCalledTimes(2)
      const resultsMessage = mockSendMessage.mock.calls[1][1] as string
      expect(resultsMessage).toContain('Filtre huile Toyota')
    })

    it('sends disambiguation question on low-confidence identification', async () => {
      mockIdentifyFromPhoto.mockResolvedValueOnce({
        status: 'disambiguation',
        identification: { name: 'Pièce', category: 'Freinage', confidence: 0.5, oemReference: null, vehicleCompatibility: null, suggestedPrice: null },
        candidates: [],
        matchingParts: [],
      })

      const app = buildApp()
      await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: makePayload('2250700000000', 'image', 'img-456'),
      })

      const disambigMessage = mockSendMessage.mock.calls[1][1] as string
      expect(disambigMessage).toContain('Freinage')
      expect(disambigMessage).toContain('Répondez')
      expect(mockSetSession).toHaveBeenCalledWith('2250700000000', {
        type: 'disambiguation',
        data: { category: 'Freinage' },
      })
    })

    it('sends failure message on very low confidence', async () => {
      mockIdentifyFromPhoto.mockResolvedValueOnce({
        status: 'failed',
        identification: null,
        candidates: [],
        matchingParts: [],
      })

      const app = buildApp()
      await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: makePayload('2250700000000', 'image', 'img-789'),
      })

      const failMessage = mockSendMessage.mock.calls[1][1] as string
      expect(failMessage).toContain('Impossible')
    })

    // AC4: Disambiguation
    it('handles disambiguation response "O" (yes)', async () => {
      mockGetSession.mockReturnValueOnce({
        type: 'disambiguation',
        data: { category: 'Filtration' },
        expiresAt: new Date(Date.now() + 60000),
      })
      mockSearchByCategory.mockResolvedValueOnce([
        { id: '1', name: 'Filtre air', category: 'Filtration', price: 3000, imageThumbUrl: null, vendor: { id: 'v1', shopName: 'Shop' } },
      ])

      const app = buildApp()
      await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: makePayload('2250700000000', 'text', 'O'),
      })

      expect(mockClearSession).toHaveBeenCalledWith('2250700000000')
      expect(mockSearchByCategory).toHaveBeenCalledWith('Filtration', undefined)
      expect(mockSendMessage).toHaveBeenCalled()
    })

    // AC5: Selection and order creation
    it('creates order when user selects a low-price item', async () => {
      mockGetSession.mockReturnValueOnce({
        type: 'selection',
        data: {
          items: [
            { id: 'cat1', name: 'Filtre', category: 'Filtration', price: 4500, imageThumbUrl: null, vendor: { id: 'v1', shopName: 'Shop' } },
          ],
        },
        expiresAt: new Date(Date.now() + 60000),
      })
      mockFindUser.mockResolvedValueOnce({ id: 'u1', phone: '+2250700000000', roles: ['OWNER'], vehicles: [] })
      mockCreateOrder.mockResolvedValueOnce({ id: 'ord1', shareToken: 'token123', items: [] })

      const app = buildApp()
      await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: makePayload('2250700000000', 'text', '1'),
      })

      expect(mockClearSession).toHaveBeenCalledWith('2250700000000')
      expect(mockCreateOrder).toHaveBeenCalledWith('u1', [{ catalogItemId: 'cat1' }], { ownerPhone: '+2250700000000' })
      const msg = mockSendMessage.mock.calls[0][1] as string
      expect(msg).toContain('Commande créée')
      expect(msg).toContain('token123')
    })

    it('sends browse link for anonymous user selection', async () => {
      mockGetSession.mockReturnValueOnce({
        type: 'selection',
        data: {
          items: [
            { id: 'cat1', name: 'Filtre', category: 'Filtration', price: 4500, imageThumbUrl: null, vendor: { id: 'v1', shopName: 'Shop' } },
          ],
        },
        expiresAt: new Date(Date.now() + 60000),
      })
      mockFindUser.mockResolvedValueOnce(null) // anonymous

      const app = buildApp()
      await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: makePayload('2250700000000', 'text', '1'),
      })

      expect(mockCreateOrder).not.toHaveBeenCalled()
      const msg = mockSendMessage.mock.calls[0][1] as string
      expect(msg).toContain('https://pieces.ci/browse')
    })

    it('sends browse link for high-value items (≥25000 FCFA)', async () => {
      mockGetSession.mockReturnValueOnce({
        type: 'selection',
        data: {
          items: [
            { id: 'cat1', name: 'Moteur', category: 'Moteur', price: 50000, imageThumbUrl: null, vendor: { id: 'v1', shopName: 'Shop' } },
          ],
        },
        expiresAt: new Date(Date.now() + 60000),
      })
      mockFindUser.mockResolvedValueOnce({ id: 'u1', phone: '+2250700000000', roles: ['OWNER'], vehicles: [] })

      const app = buildApp()
      await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: makePayload('2250700000000', 'text', '1'),
      })

      expect(mockCreateOrder).not.toHaveBeenCalled()
      const msg = mockSendMessage.mock.calls[0][1] as string
      expect(msg).toContain('https://pieces.ci/browse')
    })

    // AC6: Session expiry — non-numeric text falls through to normal commands
    it('falls through to normal command when selection text is not a number', async () => {
      mockGetSession.mockReturnValueOnce({
        type: 'selection',
        data: { items: [{ id: '1', name: 'P', category: null, price: 100, imageThumbUrl: null, vendor: { id: 'v', shopName: 'S' } }] },
        expiresAt: new Date(Date.now() + 60000),
      })

      const app = buildApp()
      await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: makePayload('2250700000000', 'text', 'aide'),
      })

      // Should handle 'aide' normally, not crash
      expect(mockSendMessage).toHaveBeenCalled()
      const msg = mockSendMessage.mock.calls[0][1] as string
      expect(msg).toContain('Bienvenue')
    })
  })
})
