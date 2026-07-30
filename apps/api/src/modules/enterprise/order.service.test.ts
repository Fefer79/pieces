import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const orderFindMany = vi.fn()
const orderCount = vi.fn()
const enterpriseMemberFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    order: {
      findMany: (...a: unknown[]) => orderFindMany(...a),
      count: (...a: unknown[]) => orderCount(...a),
    },
    enterpriseMember: { findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a) },
  },
}))

const { listEnterpriseOrders } = await import('./order.service.js')

const ENTERPRISE = 'ent-1'
const USER = 'user-1'

function asMember(role: string | null) {
  enterpriseMemberFindUnique.mockResolvedValue(role ? { role } : null)
}

beforeEach(() => {
  vi.clearAllMocks()
  orderFindMany.mockResolvedValue([])
  orderCount.mockResolvedValue(0)
})

describe('listEnterpriseOrders', () => {
  it('renvoie toutes les commandes de la flotte pour un OWNER, y compris celles des autres membres', async () => {
    asMember('OWNER')
    orderFindMany.mockResolvedValue([
      { id: 'o1', initiator: { id: 'autre-membre', name: 'Koffi' }, totalAmount: 45000 },
    ])
    orderCount.mockResolvedValue(1)

    const res = await listEnterpriseOrders(ENTERPRISE, USER)

    // Le filtre porte sur l'entreprise, jamais sur l'initiateur.
    const where = orderFindMany.mock.calls[0][0].where
    expect(where).toEqual({ enterpriseId: ENTERPRISE })
    expect(where.initiatorId).toBeUndefined()
    expect(res.orders).toHaveLength(1)
    expect(res.scope).toBe('enterprise')
  })

  it.each(['MANAGER', 'ACCOUNTANT'])('donne la visibilité complète au %s', async (role) => {
    asMember(role)
    await listEnterpriseOrders(ENTERPRISE, USER)
    expect(orderFindMany.mock.calls[0][0].where.initiatorId).toBeUndefined()
  })

  it('restreint le MECHANIC à ses propres commandes', async () => {
    asMember('MECHANIC')

    const res = await listEnterpriseOrders(ENTERPRISE, USER)

    expect(orderFindMany.mock.calls[0][0].where).toEqual({
      enterpriseId: ENTERPRISE,
      initiatorId: USER,
    })
    expect(res.scope).toBe('own')
  })

  it('refuse un non-membre', async () => {
    asMember(null)
    await expect(listEnterpriseOrders(ENTERPRISE, USER)).rejects.toMatchObject({
      code: 'ENTERPRISE_FORBIDDEN',
      statusCode: 403,
    })
    expect(orderFindMany).not.toHaveBeenCalled()
  })

  it("ne fuit pas d'une entreprise à l'autre : l'appartenance est vérifiée sur l'id du path", async () => {
    asMember(null)
    await expect(listEnterpriseOrders('ent-autre', USER)).rejects.toMatchObject({
      code: 'ENTERPRISE_FORBIDDEN',
    })
    expect(enterpriseMemberFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { uq_enterprise_member: { enterpriseId: 'ent-autre', userId: USER } },
      }),
    )
  })

  it('applique les filtres statut, véhicule et période', async () => {
    asMember('OWNER')
    await listEnterpriseOrders(ENTERPRISE, USER, {
      status: 'PAID',
      vehicleId: 'veh-1',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-02-01T00:00:00.000Z',
    })

    const where = orderFindMany.mock.calls[0][0].where
    expect(where.status).toBe('PAID')
    expect(where.vehicleId).toBe('veh-1')
    expect(where.createdAt.gte).toEqual(new Date('2026-01-01T00:00:00.000Z'))
    expect(where.createdAt.lte).toEqual(new Date('2026-02-01T00:00:00.000Z'))
  })

  it('pagine et borne la taille de page à 100', async () => {
    asMember('OWNER')
    orderCount.mockResolvedValue(45)

    const res = await listEnterpriseOrders(ENTERPRISE, USER, { page: 3, limit: 500 })

    expect(orderFindMany.mock.calls[0][0]).toMatchObject({ skip: 200, take: 100 })
    expect(res).toMatchObject({ total: 45, page: 3, totalPages: 1 })
  })

  it('compte avec le même where que la liste — sinon la pagination ment', async () => {
    asMember('MECHANIC')
    await listEnterpriseOrders(ENTERPRISE, USER, { status: 'DELIVERED' })
    expect(orderCount.mock.calls[0][0].where).toEqual(orderFindMany.mock.calls[0][0].where)
  })
})
