import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('WHATSAPP_TOKEN', 'test-wa-token')
vi.stubEnv('WHATSAPP_PHONE_ID', 'test-phone-id')
vi.stubEnv('WHATSAPP_VERIFY_TOKEN', 'my-verify-token')

const { getVerifyToken, parseIncomingMessage, sendWhatsAppMessage } = await import('./whatsapp.service.js')

describe('whatsapp.service', () => {
  beforeEach(() => { vi.clearAllMocks() })

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
    })

    it('parses an image message', () => {
      const body = {
        entry: [{
          changes: [{
            value: {
              messages: [{ from: '2250700000000', type: 'image', image: { id: 'img-123' } }],
            },
          }],
        }],
      }

      const result = parseIncomingMessage(body)
      expect(result.from).toBe('2250700000000')
      expect(result.text).toBeNull()
      expect(result.imageId).toBe('img-123')
    })

    it('returns nulls for empty body', () => {
      const result = parseIncomingMessage({})
      expect(result.from).toBeNull()
      expect(result.text).toBeNull()
      expect(result.imageId).toBeNull()
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
})
