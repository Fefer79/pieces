import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('WHATSAPP_TOKEN', 'test-wa-token')
vi.stubEnv('WHATSAPP_PHONE_ID', 'test-phone-id')

const mockSendMessage = vi.fn()
const mockSendTemplate = vi.fn()

vi.mock('../whatsapp/whatsapp.service.js', () => ({
  sendWhatsAppMessage: (...args: unknown[]) => mockSendMessage(...args),
  sendWhatsAppTemplate: (...args: unknown[]) => mockSendTemplate(...args),
}))

const { sendNotification, sendMultiChannel, notifyOrderStatusChange, notifyVendorLowStock } = await import('./notification.service.js')

describe('notification.service', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('sendNotification', () => {
    it('sends via whatsapp text', async () => {
      mockSendMessage.mockResolvedValueOnce({ success: true })

      const result = await sendNotification({ to: '225070000', channel: 'whatsapp', message: 'Test' })
      expect(result.success).toBe(true)
      expect(mockSendMessage).toHaveBeenCalledWith('225070000', 'Test')
    })

    it('sends via whatsapp template', async () => {
      mockSendTemplate.mockResolvedValueOnce({ success: true })

      const result = await sendNotification({
        to: '225070000', channel: 'whatsapp', message: 'fallback', template: 'order_confirm', params: ['123'],
      })
      expect(result.success).toBe(true)
      expect(mockSendTemplate).toHaveBeenCalledWith('225070000', 'order_confirm', ['123'])
    })

    it('returns failure for unconfigured SMS', async () => {
      const result = await sendNotification({ to: '225070000', channel: 'sms', message: 'Test' })
      expect(result.success).toBe(false)
    })

    it('returns failure for unconfigured push', async () => {
      const result = await sendNotification({ to: '225070000', channel: 'push', message: 'Test' })
      expect(result.success).toBe(false)
    })
  })

  describe('sendMultiChannel', () => {
    it('sends to multiple channels', async () => {
      mockSendMessage.mockResolvedValueOnce({ success: true })

      const results = await sendMultiChannel('225070000', ['whatsapp', 'sms'], 'Hello')
      expect(results).toHaveLength(2)
      expect(results[0].channel).toBe('whatsapp')
      expect(results[0].success).toBe(true)
      expect(results[1].channel).toBe('sms')
      expect(results[1].success).toBe(false)
    })
  })

  describe('notifyOrderStatusChange', () => {
    it('sends notification for PAID status', async () => {
      mockSendMessage.mockResolvedValueOnce({ success: true })

      const result = await notifyOrderStatusChange('225070000', 'order-12345678', 'PAID')
      expect(result.sent).toBe(true)
      expect(mockSendMessage).toHaveBeenCalledOnce()
    })

    it('skips unknown status', async () => {
      const result = await notifyOrderStatusChange('225070000', 'order-1', 'DRAFT')
      expect(result.sent).toBe(false)
    })
  })

  describe('notifyVendorLowStock', () => {
    it('sends low stock alert', async () => {
      mockSendMessage.mockResolvedValueOnce({ success: true })

      await notifyVendorLowStock('225070000', 'Plaquettes de frein')
      expect(mockSendMessage).toHaveBeenCalledWith(
        '225070000',
        expect.stringContaining('Plaquettes de frein'),
      )
    })
  })
})
