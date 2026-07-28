import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const partRequestCreate = vi.fn()
const partRequestFindFirst = vi.fn()
const partRequestFindMany = vi.fn()
const partRequestUpdate = vi.fn()
const partRequestEventCreate = vi.fn()
const partRequestPhotoCreate = vi.fn()
const enterpriseMemberFindUnique = vi.fn()
const vehicleFindFirst = vi.fn()
const catalogItemFindUnique = vi.fn()
const driverFindFirst = vi.fn()
const orderCreate = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    partRequest: {
      create: (...a: unknown[]) => partRequestCreate(...a),
      findFirst: (...a: unknown[]) => partRequestFindFirst(...a),
      findMany: (...a: unknown[]) => partRequestFindMany(...a),
      update: (...a: unknown[]) => partRequestUpdate(...a),
    },
    partRequestEvent: {
      create: (...a: unknown[]) => partRequestEventCreate(...a),
    },
    partRequestPhoto: {
      create: (...a: unknown[]) => partRequestPhotoCreate(...a),
    },
    enterpriseMember: {
      findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a),
    },
    vehicle: {
      findFirst: (...a: unknown[]) => vehicleFindFirst(...a),
    },
    catalogItem: {
      findUnique: (...a: unknown[]) => catalogItemFindUnique(...a),
    },
    driver: {
      findFirst: (...a: unknown[]) => driverFindFirst(...a),
    },
  },
}))

vi.mock('../order/order.service.js', () => ({
  createOrder: vi.fn(),
}))

const { createPartRequest, listPartRequestsForEnterprise, submitPartRequest, approvePartRequest, convertToOrder } =
  await import('./partRequest.service.js')

function asManager() {
  enterpriseMemberFindUnique.mockResolvedValue({ role: 'OWNER' })
}

function asMechanic() {
  enterpriseMemberFindUnique.mockResolvedValue({ role: 'MECHANIC' })
}

function asDriverOnly() {
  // Un chauffeur n'est pas membre de l'entreprise : assertMember échoue.
  enterpriseMemberFindUnique.mockResolvedValue(null)
}

function mockVehicle() {
  vehicleFindFirst.mockResolvedValue({ id: 'v1' })
}

describe('enterprise/partRequest.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    asManager()
    mockVehicle()
  })

  describe('createPartRequest', () => {
    it('creates a draft request and logs an event', async () => {
      asMechanic()
      partRequestCreate.mockResolvedValue({ id: 'r1' })

      await createPartRequest('e1', 'u1', {
        vehicleId: 'v1',
        partName: 'Plaquettes avant',
        urgency: 'HIGH',
        preferredSource: 'LOCAL',
      })

      expect(partRequestCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            enterpriseId: 'e1',
            vehicleId: 'v1',
            createdByUserId: 'u1',
            status: 'DRAFT',
            partName: 'Plaquettes avant',
            urgency: 'HIGH',
            preferredSource: 'LOCAL',
          }),
        }),
      )
      expect(partRequestEventCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ toStatus: 'DRAFT' }) }),
      )
    })

    it('rejects when vehicle is not in enterprise', async () => {
      asMechanic()
      vehicleFindFirst.mockResolvedValue(null)

      await expect(
        createPartRequest('e1', 'u1', {
          vehicleId: 'v1',
          partName: 'Plaquettes',
          urgency: 'NORMAL',
          preferredSource: 'ANY',
        }),
      ).rejects.toMatchObject({ code: 'VEHICLE_FORBIDDEN' })
    })

    it('allows an owner or manager to request a part too', async () => {
      asManager()
      partRequestCreate.mockResolvedValue({ id: 'r1' })

      await createPartRequest('e1', 'u1', {
        vehicleId: 'v1',
        partName: 'Plaquettes',
        urgency: 'NORMAL',
        preferredSource: 'ANY',
      })

      expect(partRequestCreate).toHaveBeenCalled()
    })

    it('refuses a member without requester role (accountant)', async () => {
      enterpriseMemberFindUnique.mockResolvedValue({ role: 'ACCOUNTANT' })

      await expect(
        createPartRequest('e1', 'u1', {
          vehicleId: 'v1',
          partName: 'Plaquettes',
          urgency: 'NORMAL',
          preferredSource: 'ANY',
        }),
      ).rejects.toMatchObject({ code: 'ENTERPRISE_INSUFFICIENT_ROLE' })
      expect(partRequestCreate).not.toHaveBeenCalled()
    })

    it('refuses a driver who is not an enterprise member', async () => {
      asDriverOnly()

      await expect(
        createPartRequest('e1', 'u1', {
          vehicleId: 'v1',
          partName: 'Plaquettes',
          urgency: 'NORMAL',
          preferredSource: 'ANY',
        }),
      ).rejects.toMatchObject({ code: 'ENTERPRISE_FORBIDDEN' })
      expect(partRequestCreate).not.toHaveBeenCalled()
    })
  })

  describe('listPartRequestsForEnterprise', () => {
    it('lists requests for the enterprise', async () => {
      partRequestFindMany.mockResolvedValue([])

      await listPartRequestsForEnterprise('e1', 'u1', { status: 'SUBMITTED' })

      expect(partRequestFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { enterpriseId: 'e1', status: 'SUBMITTED' },
        }),
      )
    })
  })

  describe('submitPartRequest', () => {
    it('moves a draft request to submitted', async () => {
      asMechanic()
      partRequestFindFirst.mockResolvedValue({ id: 'r1', status: 'DRAFT' })
      partRequestUpdate.mockResolvedValue({ id: 'r1' })

      await submitPartRequest('e1', 'u1', 'r1')

      expect(partRequestUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'SUBMITTED' } }),
      )
      expect(partRequestEventCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fromStatus: 'DRAFT', toStatus: 'SUBMITTED' }),
        }),
      )
    })

    it('refuses a member without requester role (accountant)', async () => {
      enterpriseMemberFindUnique.mockResolvedValue({ role: 'ACCOUNTANT' })
      partRequestFindFirst.mockResolvedValue({ id: 'r1', status: 'DRAFT' })

      await expect(submitPartRequest('e1', 'u1', 'r1')).rejects.toMatchObject({
        code: 'ENTERPRISE_INSUFFICIENT_ROLE',
      })
      expect(partRequestUpdate).not.toHaveBeenCalled()
    })
  })

  describe('approvePartRequest', () => {
    it('approves a submitted request and timestamps approval', async () => {
      partRequestFindFirst.mockResolvedValue({ id: 'r1', status: 'SUBMITTED' })
      partRequestUpdate.mockResolvedValue({ id: 'r1' })

      await approvePartRequest('e1', 'u1', 'r1', 'OK')

      expect(partRequestUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
            approvedByUserId: 'u1',
            approvedAt: expect.any(Date),
          }),
        }),
      )
    })

    it('refuses a mechanic approving their own request', async () => {
      asMechanic()
      partRequestFindFirst.mockResolvedValue({ id: 'r1', status: 'SUBMITTED' })

      await expect(approvePartRequest('e1', 'u1', 'r1', 'OK')).rejects.toMatchObject({
        code: 'ENTERPRISE_INSUFFICIENT_ROLE',
      })
      expect(partRequestUpdate).not.toHaveBeenCalled()
    })
  })
})
