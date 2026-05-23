import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const orderFindUnique = vi.fn()
const enterpriseMemberFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    order: { findUnique: (...a: unknown[]) => orderFindUnique(...a) },
    enterpriseMember: { findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a) },
  },
}))

const { generateDevisPdf } = await import('./devis.service.js')

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'o1',
    shareToken: 'abcdef0123456789',
    initiatorId: 'user-1',
    enterpriseId: null,
    totalAmount: 28000,
    laborCost: 5000,
    deliveryFee: 2000,
    createdAt: new Date('2026-05-10T10:00:00Z'),
    items: [
      { name: 'Filtre à huile', vendorShopName: 'Casse Yopougon', priceSnapshot: 6000 },
      { name: 'Plaquettes Bosch', vendorShopName: 'Casse Yopougon', priceSnapshot: 15000 },
    ],
    initiator: { id: 'user-1', name: 'Fernando', phone: '+2250700000000', email: 'f@x.com' },
    vehicle: null,
    enterprise: null,
    ...overrides,
  }
}

describe('devis.service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a non-empty PDF buffer with the PDF magic bytes', async () => {
    orderFindUnique.mockResolvedValueOnce(baseOrder())

    const buf = await generateDevisPdf('o1', 'user-1')

    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(1000)
    expect(buf.slice(0, 4).toString()).toBe('%PDF')
  })

  it('404s on an unknown order', async () => {
    orderFindUnique.mockResolvedValueOnce(null)

    await expect(generateDevisPdf('missing', 'user-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'ORDER_NOT_FOUND',
    })
  })

  it('403s when requester is neither the initiator nor a member of the order enterprise', async () => {
    orderFindUnique.mockResolvedValueOnce(
      baseOrder({ initiatorId: 'someone-else', enterpriseId: 'e1', enterprise: { name: 'X', commune: null, address: null, rccm: null } }),
    )
    enterpriseMemberFindUnique.mockResolvedValueOnce(null)

    await expect(generateDevisPdf('o1', 'user-1')).rejects.toMatchObject({
      statusCode: 403,
      code: 'ORDER_FORBIDDEN',
    })
  })

  it('allows an enterprise member to download a devis they did not initiate', async () => {
    orderFindUnique.mockResolvedValueOnce(
      baseOrder({
        initiatorId: 'someone-else',
        enterpriseId: 'e1',
        enterprise: { name: 'Transports SARL', commune: 'Yopougon', address: 'Bld', rccm: 'CI-RCCM-1' },
        vehicle: { brand: 'Toyota', model: 'Hilux', year: 2018, plate: 'AB-1234-CI', vin: null },
      }),
    )
    enterpriseMemberFindUnique.mockResolvedValueOnce({ id: 'mem-1' })

    const buf = await generateDevisPdf('o1', 'user-1')
    expect(buf.length).toBeGreaterThan(1000)
    expect(buf.slice(0, 4).toString()).toBe('%PDF')
  })
})
