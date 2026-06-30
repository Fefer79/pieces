import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockVendorFindMany = vi.fn()
const mockVendorUpdateMany = vi.fn()
const mockNotify = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    vendor: {
      findMany: (...args: unknown[]) => mockVendorFindMany(...args),
      updateMany: (...args: unknown[]) => mockVendorUpdateMany(...args),
    },
  },
}))

vi.mock('../notification/notification.service.js', () => ({
  notifyVendorsIncomplete: (...args: unknown[]) => mockNotify(...args),
}))

const { scanAndSendVendorRelances, vendorMissingFields } = await import('./vendorRelance.service.js')

// Helper : un vendeur incomplet géré par un liaison joignable.
function vendor(over: Record<string, unknown> = {}) {
  return {
    id: 'v1',
    shopName: 'Auto Pièces Yop',
    commune: null,
    lat: null,
    managedByLiaisonId: 'liaison-1',
    kyc: null,
    managedByLiaison: { phone: '+2250700000000' },
    ...over,
  }
}

describe('vendorRelance.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotify.mockResolvedValue({ success: true })
    mockVendorUpdateMany.mockResolvedValue({ count: 0 })
  })

  describe('vendorMissingFields', () => {
    it('lists only the missing fields', () => {
      expect(vendorMissingFields({ commune: 'Yopougon', lat: 5.3, kyc: { id: 'k' } })).toEqual([])
      expect(vendorMissingFields({ commune: null, lat: null, kyc: null })).toEqual(['KYC', 'commune', 'GPS'])
      expect(vendorMissingFields({ commune: 'Yopougon', lat: null, kyc: { id: 'k' } })).toEqual(['GPS'])
    })
  })

  it('sends one digest per liaison and marks the vendors relanced', async () => {
    mockVendorFindMany.mockResolvedValue([
      vendor({ id: 'v1', shopName: 'Shop A' }),
      vendor({ id: 'v2', shopName: 'Shop B', commune: 'Cocody', lat: 5.3 }), // missing only KYC
    ])

    const out = await scanAndSendVendorRelances()

    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockNotify).toHaveBeenCalledWith(
      '+2250700000000',
      expect.objectContaining({
        vendors: [
          { shopName: 'Shop A', missing: ['KYC', 'commune', 'GPS'] },
          { shopName: 'Shop B', missing: ['KYC'] },
        ],
      }),
    )
    expect(mockVendorUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['v1', 'v2'] } },
      data: { relanceLastSentAt: expect.any(Date), relanceCount: { increment: 1 } },
    })
    expect(out).toEqual({ vendorsDue: 2, liaisonsNotified: 1, vendorsRelanced: 2 })
  })

  it('does NOT mark vendors when WhatsApp is not configured (send fails)', async () => {
    mockNotify.mockResolvedValue({ success: false, reason: 'WhatsApp not configured' })
    mockVendorFindMany.mockResolvedValue([vendor()])

    const out = await scanAndSendVendorRelances()

    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockVendorUpdateMany).not.toHaveBeenCalled()
    expect(out).toEqual({ vendorsDue: 1, liaisonsNotified: 0, vendorsRelanced: 0 })
  })

  it('skips a liaison with no reachable phone', async () => {
    mockVendorFindMany.mockResolvedValue([
      vendor({ managedByLiaison: { phone: null } }),
    ])

    const out = await scanAndSendVendorRelances()

    expect(mockNotify).not.toHaveBeenCalled()
    expect(mockVendorUpdateMany).not.toHaveBeenCalled()
    expect(out.vendorsRelanced).toBe(0)
  })

  it('groups vendors from different liaisons into separate messages', async () => {
    mockVendorFindMany.mockResolvedValue([
      vendor({ id: 'v1', managedByLiaisonId: 'liaison-1', managedByLiaison: { phone: '+2250700000001' } }),
      vendor({ id: 'v2', managedByLiaisonId: 'liaison-2', managedByLiaison: { phone: '+2250700000002' } }),
    ])

    const out = await scanAndSendVendorRelances()

    expect(mockNotify).toHaveBeenCalledTimes(2)
    expect(out.liaisonsNotified).toBe(2)
    expect(out.vendorsRelanced).toBe(2)
  })
})
