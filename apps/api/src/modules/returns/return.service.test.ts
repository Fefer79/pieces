import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const returnFindUnique = vi.fn()
const returnCreate = vi.fn()
const returnUpdate = vi.fn()
const returnFindMany = vi.fn()
const orderFindUnique = vi.fn()
const orderItemFindUnique = vi.fn()
const orderItemFindMany = vi.fn()
const enterpriseMemberFindUnique = vi.fn()
const vendorFindFirst = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    returnOrder: {
      findUnique: (...a: unknown[]) => returnFindUnique(...a),
      findMany: (...a: unknown[]) => returnFindMany(...a),
      create: (...a: unknown[]) => returnCreate(...a),
      update: (...a: unknown[]) => returnUpdate(...a),
    },
    order: { findUnique: (...a: unknown[]) => orderFindUnique(...a) },
    orderItem: {
      findUnique: (...a: unknown[]) => orderItemFindUnique(...a),
      findMany: (...a: unknown[]) => orderItemFindMany(...a),
    },
    enterpriseMember: { findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a) },
    vendor: { findFirst: (...a: unknown[]) => vendorFindFirst(...a) },
  },
}))

const ADMIN = { id: 'admin-1', roles: ['ADMIN'] }

const {
  canTransition,
  createReturn,
  getReturn,
  transitionReturn,
  listReturnsForEnterprise,
  cancelReturn,
} = await import('./return.service.js')

describe('canTransition (return state machine)', () => {
  it('allows REQUESTED → ACCEPTED', () => {
    expect(canTransition('REQUESTED', 'ACCEPTED')).toBe(true)
  })
  it('forbids REQUESTED → PICKED_UP (must accept first)', () => {
    expect(canTransition('REQUESTED', 'PICKED_UP')).toBe(false)
  })
  it('allows INSPECTED → REFUNDED and INSPECTED → REJECTED', () => {
    expect(canTransition('INSPECTED', 'REFUNDED')).toBe(true)
    expect(canTransition('INSPECTED', 'REJECTED')).toBe(true)
  })
  it('is terminal after REFUNDED / REJECTED / CANCELLED', () => {
    expect(canTransition('REFUNDED', 'ACCEPTED')).toBe(false)
    expect(canTransition('REJECTED', 'ACCEPTED')).toBe(false)
    expect(canTransition('CANCELLED', 'ACCEPTED')).toBe(false)
  })
  it('forbids cancel after PICKED_UP', () => {
    expect(canTransition('PICKED_UP', 'CANCELLED')).toBe(false)
  })
})

describe('createReturn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects if order not found', async () => {
    orderFindUnique.mockResolvedValueOnce(null)
    await expect(
      createReturn('u1', { orderId: 'o1', reason: 'DEFECTIVE' }),
    ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' })
  })

  it('rejects if user is not the initiator and order has no enterprise', async () => {
    orderFindUnique.mockResolvedValueOnce({
      id: 'o1', enterpriseId: null, initiatorId: 'someone-else', status: 'COMPLETED',
    })
    await expect(
      createReturn('u1', { orderId: 'o1', reason: 'DEFECTIVE' }),
    ).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' })
  })

  it('rejects when orderItemId does not belong to the order', async () => {
    orderFindUnique.mockResolvedValueOnce({
      id: 'o1', enterpriseId: 'e1', initiatorId: 'u1', status: 'COMPLETED',
    })
    orderItemFindUnique.mockResolvedValueOnce({ orderId: 'OTHER-ORDER' })
    await expect(
      createReturn('u1', { orderId: 'o1', orderItemId: 'i1', reason: 'WRONG_PART' }),
    ).rejects.toMatchObject({ code: 'ORDER_ITEM_NOT_IN_ORDER' })
  })

  it('creates a return with REQUESTED default status', async () => {
    orderFindUnique.mockResolvedValueOnce({
      id: 'o1', enterpriseId: 'e1', initiatorId: 'u1', status: 'COMPLETED',
    })
    returnCreate.mockResolvedValueOnce({ id: 'r1', status: 'REQUESTED' })

    const r = await createReturn('u1', { orderId: 'o1', reason: 'DEFECTIVE' })
    expect(r.status).toBe('REQUESTED')
    expect(returnCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 'o1', enterpriseId: 'e1', requestedById: 'u1', reason: 'DEFECTIVE',
        }),
      }),
    )
  })

  it('rejects a non-initiator who is NOT a member of the order enterprise (bug fix)', async () => {
    orderFindUnique.mockResolvedValueOnce({
      id: 'o1', enterpriseId: 'e1', initiatorId: 'someone-else', status: 'COMPLETED',
    })
    enterpriseMemberFindUnique.mockResolvedValueOnce(null) // not a member
    await expect(
      createReturn('intruder', { orderId: 'o1', reason: 'DEFECTIVE' }),
    ).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' })
    expect(returnCreate).not.toHaveBeenCalled()
  })

  it('allows a member of the order enterprise to create a return', async () => {
    orderFindUnique.mockResolvedValueOnce({
      id: 'o1', enterpriseId: 'e1', initiatorId: 'someone-else', status: 'COMPLETED',
    })
    enterpriseMemberFindUnique.mockResolvedValueOnce({ id: 'm1' }) // is a member
    returnCreate.mockResolvedValueOnce({ id: 'r1', status: 'REQUESTED' })

    const r = await createReturn('member-1', { orderId: 'o1', reason: 'DEFECTIVE' })
    expect(r.status).toBe('REQUESTED')
  })
})

describe('getReturn (access control)', () => {
  beforeEach(() => vi.clearAllMocks())

  const ret = {
    id: 'r1', requestedById: 'u1', orderId: 'o1',
    order: { id: 'o1', totalAmount: 5000, status: 'COMPLETED', enterpriseId: null },
  }

  it('lets the requester read their own return', async () => {
    returnFindUnique.mockResolvedValueOnce(ret)
    const r = await getReturn('r1', { id: 'u1', roles: [] })
    expect(r.id).toBe('r1')
  })

  it('denies an unrelated user (IDOR)', async () => {
    returnFindUnique.mockResolvedValueOnce(ret)
    orderItemFindMany.mockResolvedValueOnce([{ vendorId: 'v1' }])
    vendorFindFirst.mockResolvedValueOnce(null) // not a vendor on the order
    await expect(getReturn('r1', { id: 'intruder', roles: [] })).rejects.toMatchObject({
      code: 'NOT_AUTHORIZED',
    })
  })

  it('lets an admin read any return', async () => {
    returnFindUnique.mockResolvedValueOnce(ret)
    const r = await getReturn('r1', ADMIN)
    expect(r.id).toBe('r1')
  })
})

describe('listReturnsForEnterprise (tenant isolation)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('denies a non-member', async () => {
    enterpriseMemberFindUnique.mockResolvedValueOnce(null)
    await expect(listReturnsForEnterprise('e1', { id: 'intruder', roles: [] })).rejects.toMatchObject({
      code: 'NOT_AUTHORIZED',
    })
    expect(returnFindMany).not.toHaveBeenCalled()
  })

  it('lets a member list the enterprise returns', async () => {
    enterpriseMemberFindUnique.mockResolvedValueOnce({ id: 'm1' })
    returnFindMany.mockResolvedValueOnce([{ id: 'r1' }])
    const rows = await listReturnsForEnterprise('e1', { id: 'member-1', roles: [] })
    expect(rows).toHaveLength(1)
  })
})

describe('transitionReturn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a requester who is neither admin nor a vendor on the order', async () => {
    returnFindUnique.mockResolvedValueOnce({ id: 'r1', status: 'REQUESTED', orderId: 'o1' })
    orderItemFindMany.mockResolvedValueOnce([{ vendorId: 'v1' }])
    vendorFindFirst.mockResolvedValueOnce(null) // requester owns no vendor on the order
    await expect(
      transitionReturn('r1', 'ACCEPTED', { id: 'intruder', roles: ['SELLER'] }),
    ).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' })
    expect(returnUpdate).not.toHaveBeenCalled()
  })

  it('rejects invalid transition', async () => {
    returnFindUnique.mockResolvedValueOnce({ id: 'r1', status: 'REQUESTED', orderId: 'o1' })
    await expect(transitionReturn('r1', 'REFUNDED', ADMIN)).rejects.toMatchObject({
      code: 'INVALID_RETURN_TRANSITION',
    })
  })

  it('requires refundAmount when transitioning to REFUNDED', async () => {
    returnFindUnique.mockResolvedValueOnce({ id: 'r1', status: 'INSPECTED', orderId: 'o1' })
    await expect(transitionReturn('r1', 'REFUNDED', ADMIN)).rejects.toMatchObject({
      code: 'REFUND_AMOUNT_REQUIRED',
    })
  })

  it('writes the matching timestamp field on success (vendor on order)', async () => {
    returnFindUnique.mockResolvedValueOnce({ id: 'r1', status: 'REQUESTED', orderId: 'o1' })
    orderItemFindMany.mockResolvedValueOnce([{ vendorId: 'v1' }])
    vendorFindFirst.mockResolvedValueOnce({ id: 'v1' }) // requester owns vendor v1
    returnUpdate.mockResolvedValueOnce({ id: 'r1', status: 'ACCEPTED' })

    await transitionReturn('r1', 'ACCEPTED', { id: 'vendor-user', roles: ['SELLER'] })
    expect(returnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ACCEPTED',
          acceptedAt: expect.any(Date),
        }),
      }),
    )
  })
})

describe('cancelReturn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('forbids cancel from a non-requester', async () => {
    returnFindUnique.mockResolvedValueOnce({ id: 'r1', status: 'REQUESTED', requestedById: 'other' })
    await expect(cancelReturn('u1', 'r1')).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' })
  })

  it('forbids cancel from non-cancellable state', async () => {
    returnFindUnique.mockResolvedValueOnce({ id: 'r1', status: 'PICKED_UP', requestedById: 'u1' })
    await expect(cancelReturn('u1', 'r1')).rejects.toMatchObject({
      code: 'INVALID_RETURN_TRANSITION',
    })
  })

  it('cancels a REQUESTED return', async () => {
    returnFindUnique.mockResolvedValueOnce({ id: 'r1', status: 'REQUESTED', requestedById: 'u1' })
    returnUpdate.mockResolvedValueOnce({ id: 'r1', status: 'CANCELLED' })

    const r = await cancelReturn('u1', 'r1')
    expect(r.status).toBe('CANCELLED')
    expect(returnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED', cancelledAt: expect.any(Date) }),
      }),
    )
  })
})
