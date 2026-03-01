import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockIdentifyPart = vi.fn()
const mockCatalogItemFindMany = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  },
}))

vi.mock('../../lib/gemini.js', () => ({
  identifyPart: (...args: unknown[]) => mockIdentifyPart(...args),
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    catalogItem: {
      findMany: (...args: unknown[]) => mockCatalogItemFindMany(...args),
    },
  },
}))

const { identifyFromPhoto, searchByCategory } = await import('./vision.service.js')

describe('vision.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('identifyFromPhoto', () => {
    it('returns identified status for high confidence result', async () => {
      mockIdentifyPart.mockResolvedValueOnce({
        name: 'Filtre à huile',
        category: 'Filtration',
        oemReference: null,
        vehicleCompatibility: null,
        suggestedPrice: 5000,
        confidence: 0.9,
      })
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre à huile', category: 'Filtration', price: 5000, imageThumbUrl: null, vendor: { id: 'v1', shopName: 'Shop' } },
      ])

      const result = await identifyFromPhoto(Buffer.from('fake'), 'image/jpeg')

      expect(result.status).toBe('identified')
      expect(result.matchingParts).toHaveLength(1)
      expect(result.identification?.name).toBe('Filtre à huile')
    })

    it('returns disambiguation status for low confidence result', async () => {
      mockIdentifyPart.mockResolvedValueOnce({
        name: 'Pièce inconnue',
        category: 'Freinage',
        oemReference: null,
        vehicleCompatibility: null,
        suggestedPrice: null,
        confidence: 0.5,
      })
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'c1', name: 'Plaquettes', category: 'Freinage', price: 8000, imageThumbUrl: null, vendor: { id: 'v1', shopName: 'Shop' } },
      ])

      const result = await identifyFromPhoto(Buffer.from('fake'), 'image/jpeg')

      expect(result.status).toBe('disambiguation')
      expect(result.candidates).toHaveLength(1)
    })

    it('returns failed when gemini returns null', async () => {
      mockIdentifyPart.mockResolvedValueOnce(null)

      const result = await identifyFromPhoto(Buffer.from('fake'), 'image/jpeg')

      expect(result.status).toBe('failed')
    })

    it('returns failed for very low confidence', async () => {
      mockIdentifyPart.mockResolvedValueOnce({
        name: 'Unknown',
        category: 'Autre',
        oemReference: null,
        vehicleCompatibility: null,
        suggestedPrice: null,
        confidence: 0.1,
      })

      const result = await identifyFromPhoto(Buffer.from('fake'), 'image/jpeg')

      expect(result.status).toBe('failed')
    })
  })

  describe('searchByCategory', () => {
    it('returns matching parts for category', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Disque', category: 'Freinage', price: 15000, imageThumbUrl: null, vendor: { id: 'v1', shopName: 'Shop' } },
      ])

      const result = await searchByCategory('Freinage')

      expect(result).toHaveLength(1)
    })
  })
})
