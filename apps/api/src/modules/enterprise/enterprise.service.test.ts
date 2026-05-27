import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const enterpriseFindUnique = vi.fn()
const enterpriseCreate = vi.fn()
const enterpriseMemberFindMany = vi.fn()
const enterpriseMemberFindUnique = vi.fn()
const enterpriseMemberCreate = vi.fn()
const enterpriseMemberCount = vi.fn()
const enterpriseMemberDelete = vi.fn()
const userFindFirst = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    enterprise: {
      findUnique: (...a: unknown[]) => enterpriseFindUnique(...a),
      create: (...a: unknown[]) => enterpriseCreate(...a),
    },
    enterpriseMember: {
      findMany: (...a: unknown[]) => enterpriseMemberFindMany(...a),
      findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a),
      create: (...a: unknown[]) => enterpriseMemberCreate(...a),
      count: (...a: unknown[]) => enterpriseMemberCount(...a),
      delete: (...a: unknown[]) => enterpriseMemberDelete(...a),
    },
    user: {
      findFirst: (...a: unknown[]) => userFindFirst(...a),
    },
  },
}))

const {
  createEnterprise,
  listEnterprisesForUser,
  assertMember,
  inviteMember,
  removeMember,
} = await import('./enterprise.service.js')

describe('enterprise.service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('createEnterprise', () => {
    it('creates with a slug derived from name + makes creator OWNER', async () => {
      enterpriseFindUnique.mockResolvedValue(null) // slug available
      enterpriseCreate.mockResolvedValueOnce({ id: 'e1', name: 'Transports Yopougon SARL', slug: 'transports-yopougon-sarl' })

      await createEnterprise('user-1', { name: 'Transports Yopougon SARL', commune: 'Yopougon' })

      expect(enterpriseCreate).toHaveBeenCalledTimes(1)
      const callArg = enterpriseCreate.mock.calls[0]![0] as { data: { slug: string; members: { create: { role: string; userId: string } } } }
      expect(callArg.data.slug).toBe('transports-yopougon-sarl')
      expect(callArg.data.members.create.role).toBe('OWNER')
      expect(callArg.data.members.create.userId).toBe('user-1')
    })

    it('falls back to a numbered slug when the base is taken', async () => {
      enterpriseFindUnique
        .mockResolvedValueOnce({ id: 'taken' }) // base slug taken
        .mockResolvedValueOnce(null)             // -2 available
      enterpriseCreate.mockResolvedValueOnce({ id: 'e1' })

      await createEnterprise('user-1', { name: 'Garage Plateau', commune: 'Plateau' })

      const callArg = enterpriseCreate.mock.calls[0]![0] as { data: { slug: string } }
      expect(callArg.data.slug).toBe('garage-plateau-2')
    })

    it('strips diacritics and special chars from slug', async () => {
      enterpriseFindUnique.mockResolvedValue(null)
      enterpriseCreate.mockResolvedValueOnce({ id: 'e1' })

      await createEnterprise('user-1', { name: 'Sociéte 2é Échélon!', commune: 'Treichville' })

      const callArg = enterpriseCreate.mock.calls[0]![0] as { data: { slug: string } }
      expect(callArg.data.slug).toMatch(/^societe-2e-echelon$/)
    })
  })

  describe('listEnterprisesForUser', () => {
    it('flattens membership + role into enterprise summaries', async () => {
      enterpriseMemberFindMany.mockResolvedValueOnce([
        {
          role: 'OWNER',
          joinedAt: new Date('2026-05-01'),
          enterprise: { id: 'e1', name: 'A', slug: 'a', address: null, rccm: null, createdAt: new Date() },
        },
      ])

      const result = await listEnterprisesForUser('user-1')

      expect(result).toHaveLength(1)
      expect(result[0]!.memberRole).toBe('OWNER')
      expect(result[0]!.id).toBe('e1')
    })
  })

  describe('assertMember', () => {
    it('throws 403 when user is not a member', async () => {
      enterpriseMemberFindUnique.mockResolvedValueOnce(null)
      await expect(assertMember('e1', 'user-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'ENTERPRISE_FORBIDDEN',
      })
    })

    it('throws 403 when member role is below the required set', async () => {
      enterpriseMemberFindUnique.mockResolvedValueOnce({ role: 'MECHANIC' })
      await expect(assertMember('e1', 'user-1', ['OWNER', 'MANAGER'])).rejects.toMatchObject({
        statusCode: 403,
        code: 'ENTERPRISE_INSUFFICIENT_ROLE',
      })
    })

    it('passes when role is in the allowed set', async () => {
      enterpriseMemberFindUnique.mockResolvedValueOnce({ role: 'MANAGER' })
      await expect(assertMember('e1', 'user-1', ['OWNER', 'MANAGER'])).resolves.toEqual({ role: 'MANAGER' })
    })
  })

  describe('inviteMember', () => {
    beforeEach(() => {
      // The invoker is a MANAGER by default
      enterpriseMemberFindUnique.mockImplementation((args: { where: { uq_enterprise_member?: { userId: string } } }) => {
        const userId = args.where.uq_enterprise_member?.userId
        if (userId === 'inviter-1') return Promise.resolve({ role: 'MANAGER' })
        return Promise.resolve(null)
      })
    })

    it('rejects when invitee user does not exist on Pièces', async () => {
      userFindFirst.mockResolvedValueOnce(null)
      await expect(
        inviteMember('e1', 'inviter-1', { phone: '+2250700000000', role: 'MECHANIC' }),
      ).rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' })
    })

    it('rejects when invitee is already a member', async () => {
      userFindFirst.mockResolvedValueOnce({ id: 'target-1' })
      // Re-mock so that the second findUnique call (existence check on target) returns a member
      enterpriseMemberFindUnique.mockImplementation((args: { where: { uq_enterprise_member?: { userId: string } } }) => {
        const userId = args.where.uq_enterprise_member?.userId
        if (userId === 'inviter-1') return Promise.resolve({ role: 'MANAGER' })
        if (userId === 'target-1') return Promise.resolve({ id: 'm-existing' })
        return Promise.resolve(null)
      })
      await expect(
        inviteMember('e1', 'inviter-1', { email: 'x@y.com', role: 'MECHANIC' }),
      ).rejects.toMatchObject({ statusCode: 409, code: 'MEMBER_ALREADY_EXISTS' })
    })

    it('creates the membership when target exists and is not yet a member', async () => {
      userFindFirst.mockResolvedValueOnce({ id: 'target-1', name: 'Jean', phone: null, email: 'j@x.com' })
      enterpriseMemberCreate.mockResolvedValueOnce({
        id: 'm1', role: 'MECHANIC', invitedAt: new Date(), joinedAt: new Date(),
        user: { id: 'target-1', name: 'Jean', phone: null, email: 'j@x.com' },
      })

      const result = await inviteMember('e1', 'inviter-1', { email: 'j@x.com', role: 'MECHANIC' })

      expect(enterpriseMemberCreate).toHaveBeenCalledTimes(1)
      expect(result.user.email).toBe('j@x.com')
    })

    it('rejects when invoker is a MECHANIC (not OWNER/MANAGER)', async () => {
      enterpriseMemberFindUnique.mockImplementation(() => Promise.resolve({ role: 'MECHANIC' }))
      await expect(
        inviteMember('e1', 'inviter-1', { email: 'x@y.com', role: 'MECHANIC' }),
      ).rejects.toMatchObject({ statusCode: 403, code: 'ENTERPRISE_INSUFFICIENT_ROLE' })
    })
  })

  describe('removeMember', () => {
    it('refuses to remove the last OWNER', async () => {
      enterpriseMemberFindUnique.mockResolvedValueOnce({ role: 'OWNER' }) // actor check
      const memberFindUniqueById = vi.fn().mockResolvedValueOnce({
        enterpriseId: 'e1', userId: 'u-owner', role: 'OWNER',
      })
      // Override the second findUnique call shape (by id) — service uses findUnique({ where: { id } })
      enterpriseMemberFindUnique.mockImplementationOnce(memberFindUniqueById)
      enterpriseMemberCount.mockResolvedValueOnce(1) // exactly one OWNER left

      await expect(removeMember('e1', 'actor-1', 'm-owner')).rejects.toMatchObject({
        statusCode: 400,
        code: 'LAST_OWNER',
      })
      expect(enterpriseMemberDelete).not.toHaveBeenCalled()
    })

    it('removes a non-owner member', async () => {
      enterpriseMemberFindUnique
        .mockResolvedValueOnce({ role: 'OWNER' }) // actor
        .mockResolvedValueOnce({ enterpriseId: 'e1', userId: 'u-mech', role: 'MECHANIC' }) // target
      enterpriseMemberDelete.mockResolvedValueOnce({})

      await removeMember('e1', 'actor-1', 'm-mech')

      expect(enterpriseMemberDelete).toHaveBeenCalledWith({ where: { id: 'm-mech' } })
    })
  })
})
