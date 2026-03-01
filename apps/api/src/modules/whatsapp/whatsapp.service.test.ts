import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('WHATSAPP_TOKEN', 'test-wa-token')
vi.stubEnv('WHATSAPP_PHONE_ID', 'test-phone-id')
vi.stubEnv('WHATSAPP_VERIFY_TOKEN', 'my-verify-token')

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

const { prisma } = await import('../../lib/prisma.js')

const {
  getVerifyToken,
  parseIncomingMessage,
  sendWhatsAppMessage,
  formatSearchResults,
  downloadWhatsAppMedia,
  getSession,
  setSession,
  clearSession,
  findUserByWhatsApp,
  _getSessionsMap,
} = await import('./whatsapp.service.js')

describe('whatsapp.service', () => {
  beforeEach(() => { vi.clearAllMocks(); _getSessionsMap().clear() })

  describe('getVerifyToken', () => {
    it('returns the configured verify token', () => {
      expect(getVerifyToken()).toBe('my-verify-token')
    })
  })

  describe('parseIncomingMessage', () => {
    it('parses a text message', () => {
      const body = {
        entry: [{
          changes: [{
            value: {
              messages: [{ from: '2250700000000', type: 'text', text: { body: 'aide' } }],
            },
          }],
        }],
      }

      const result = parseIncomingMessage(body)
      expect(result.from).toBe('2250700000000')
      expect(result.text).toBe('aide')
      expect(result.imageId).toBeNull()
      expect(result.imageMimeType).toBeNull()
    })

    it('parses an image message with mime type', () => {
      const body = {
        entry: [{
          changes: [{
            value: {
              messages: [{ from: '2250700000000', type: 'image', image: { id: 'img-123', mime_type: 'image/png' } }],
            },
          }],
        }],
      }

      const result = parseIncomingMessage(body)
      expect(result.from).toBe('2250700000000')
      expect(result.text).toBeNull()
      expect(result.imageId).toBe('img-123')
      expect(result.imageMimeType).toBe('image/png')
    })

    it('returns nulls for empty body', () => {
      const result = parseIncomingMessage({})
      expect(result.from).toBeNull()
      expect(result.text).toBeNull()
      expect(result.imageId).toBeNull()
      expect(result.imageMimeType).toBeNull()
    })
  })

  describe('sendWhatsAppMessage', () => {
    it('calls Graph API and returns success', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({ ok: true })
      vi.stubGlobal('fetch', mockFetch)

      const result = await sendWhatsAppMessage('2250700000000', 'Bonjour')
      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledOnce()
    })

    it('returns failure on API error', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({ ok: false })
      vi.stubGlobal('fetch', mockFetch)

      const result = await sendWhatsAppMessage('2250700000000', 'Bonjour')
      expect(result.success).toBe(false)
    })
  })

  describe('formatSearchResults', () => {
    it('formats results with emoji numbering', () => {
      const items = [
        { id: '1', name: 'Filtre huile', category: 'Filtration', price: 4500, imageThumbUrl: null, vendor: { id: 'v1', shopName: 'Auto Parts' } },
        { id: '2', name: 'Filtre air', category: 'Filtration', price: 3200, imageThumbUrl: null, vendor: { id: 'v2', shopName: 'Pièces Express' } },
      ]

      const result = formatSearchResults(items, 'filtre')
      expect(result).toContain('Résultats pour "filtre"')
      expect(result).toContain('1️⃣')
      expect(result).toContain('2️⃣')
      expect(result).toContain('Filtre huile')
      expect(result).toMatch(/4.500 FCFA/)
      expect(result).toContain('Auto Parts')
      expect(result).toContain('Répondez le numéro')
    })

    it('returns no-results message for empty array', () => {
      const result = formatSearchResults([], 'xyz')
      expect(result).toContain('Aucun résultat')
      expect(result).toContain('xyz')
      expect(result).toContain('Essayez')
    })

    it('handles items with null price', () => {
      const items = [
        { id: '1', name: 'Pièce', category: null, price: null, imageThumbUrl: null, vendor: { id: 'v1', shopName: 'Shop' } },
      ]

      const result = formatSearchResults(items)
      expect(result).toContain('Prix non disponible')
    })

    it('limits to 5 results max', () => {
      const items = Array.from({ length: 8 }, (_, i) => ({
        id: String(i), name: `Part ${i}`, category: null, price: 1000, imageThumbUrl: null, vendor: { id: 'v', shopName: 'S' },
      }))

      const result = formatSearchResults(items)
      expect(result).toContain('5️⃣')
      expect(result).not.toContain('6️⃣')
    })
  })

  describe('session management', () => {
    it('stores and retrieves sessions', () => {
      setSession('225070000', { type: 'selection', data: { items: [] } })
      const session = getSession('225070000')
      expect(session).not.toBeNull()
      expect(session!.type).toBe('selection')
    })

    it('returns null for expired sessions', () => {
      const sessions = _getSessionsMap()
      sessions.set('225070000', {
        type: 'selection',
        data: { items: [] },
        expiresAt: new Date(Date.now() - 1000), // expired
      })

      expect(getSession('225070000')).toBeNull()
      expect(sessions.has('225070000')).toBe(false)
    })

    it('clears sessions', () => {
      setSession('225070000', { type: 'selection', data: { items: [] } })
      clearSession('225070000')
      expect(getSession('225070000')).toBeNull()
    })
  })

  describe('findUserByWhatsApp', () => {
    it('looks up user by formatted phone +{waNumber}', async () => {
      const mockUser = { id: 'u1', phone: '+2250700000000', roles: ['OWNER'], vehicles: [] }
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser)

      const result = await findUserByWhatsApp('2250700000000')
      expect(result).toEqual(mockUser)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { phone: '+2250700000000' },
        include: { vehicles: true },
      })
    })

    it('returns null when no user matches', async () => {
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const result = await findUserByWhatsApp('2250700000000')
      expect(result).toBeNull()
    })
  })

  describe('downloadWhatsAppMedia', () => {
    it('downloads image in two steps via Graph API', async () => {
      const mockFetch = vi.fn()
        // Step 1: get media URL
        .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://cdn.meta.com/img.jpg' }) })
        // Step 2: download image
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })
      vi.stubGlobal('fetch', mockFetch)

      const buffer = await downloadWhatsAppMedia('img-123')
      expect(buffer).toBeInstanceOf(Buffer)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch.mock.calls[0][0]).toContain('img-123')
      expect(mockFetch.mock.calls[1][0]).toBe('https://cdn.meta.com/img.jpg')
    })

    it('throws on media URL fetch failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false }))
      await expect(downloadWhatsAppMedia('img-bad')).rejects.toThrow('Failed to get media URL')
    })
  })
})
