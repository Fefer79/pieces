import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const U1 = '11111111-2222-4333-8444-555555555555'
const V1 = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const TAG1 = '99999999-8888-4777-8666-555555555555'
const TASK1 = '123e4567-e89b-42d3-a456-426614174000'
const ASSIGNEE = 'abcdef01-2345-4678-89ab-cdef01234567'
const ADMIN = 'f0f0f0f0-1111-4222-8333-444444444444'

const mockUserFindUnique = vi.fn()
const mockVendorFindUnique = vi.fn()
const mockInteractionCreate = vi.fn()
const mockInteractionFindMany = vi.fn()
const mockTaskCreate = vi.fn()
const mockTaskFindUnique = vi.fn()
const mockTaskUpdate = vi.fn()
const mockTagFindUnique = vi.fn()
const mockTagCreate = vi.fn()
const mockTagAssignUpsert = vi.fn()
const mockOrderFindMany = vi.fn()
const mockDisputeFindMany = vi.fn()
const mockReturnFindMany = vi.fn()
const mockReviewFindMany = vi.fn()
const mockPartRequestFindMany = vi.fn()
const mockNotify = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    vendor: { findUnique: (...args: unknown[]) => mockVendorFindUnique(...args) },
    crmInteraction: {
      create: (...args: unknown[]) => mockInteractionCreate(...args),
      findMany: (...args: unknown[]) => mockInteractionFindMany(...args),
    },
    crmTask: {
      create: (...args: unknown[]) => mockTaskCreate(...args),
      findUnique: (...args: unknown[]) => mockTaskFindUnique(...args),
      update: (...args: unknown[]) => mockTaskUpdate(...args),
    },
    crmTag: {
      findUnique: (...args: unknown[]) => mockTagFindUnique(...args),
      create: (...args: unknown[]) => mockTagCreate(...args),
    },
    crmTagAssignment: {
      upsert: (...args: unknown[]) => mockTagAssignUpsert(...args),
    },
    order: { findMany: (...args: unknown[]) => mockOrderFindMany(...args) },
    dispute: { findMany: (...args: unknown[]) => mockDisputeFindMany(...args) },
    returnOrder: { findMany: (...args: unknown[]) => mockReturnFindMany(...args) },
    sellerReview: { findMany: (...args: unknown[]) => mockReviewFindMany(...args) },
    partRequest: { findMany: (...args: unknown[]) => mockPartRequestFindMany(...args) },
  },
}))

vi.mock('../whatsapp/whatsapp.service.js', () => ({
  notifyWhatsAppUser: (...args: unknown[]) => mockNotify(...args),
}))

vi.mock('../../lib/crmSegments.js', () => ({
  countClientSegments: vi.fn(),
}))

const {
  getCrmTimeline,
  addCrmInteraction,
  createCrmTask,
  updateCrmTask,
  assignCrmTag,
  sendCrmRelance,
} = await import('./crm.service.js')

describe('crm.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCrmTimeline', () => {
    it('rejects with CRM_TARGET_NOT_FOUND when the subject does not exist', async () => {
      mockUserFindUnique.mockResolvedValue(null)
      await expect(getCrmTimeline('USER', U1, {})).rejects.toMatchObject({
        code: 'CRM_TARGET_NOT_FOUND',
        statusCode: 404,
      })
    })

    it('merges interactions and platform activity, sorted desc, for a USER', async () => {
      mockUserFindUnique.mockResolvedValue({ id: U1 })
      mockInteractionFindMany.mockResolvedValue([
        {
          id: 'i1',
          type: 'NOTE',
          details: 'Rappeler lundi',
          meta: null,
          createdAt: new Date('2026-07-30T10:00:00Z'),
          author: { name: 'Admin A' },
        },
      ])
      mockOrderFindMany.mockResolvedValue([
        {
          id: 'abcdef1234567890',
          status: 'PAID',
          totalAmount: 12500,
          createdAt: new Date('2026-07-29T10:00:00Z'),
        },
      ])
      mockDisputeFindMany.mockResolvedValue([])
      mockReturnFindMany.mockResolvedValue([])
      mockReviewFindMany.mockResolvedValue([])
      mockPartRequestFindMany.mockResolvedValue([])

      const result = await getCrmTimeline('USER', U1, {})

      expect(result.total).toBe(2)
      expect(result.limit).toBe(50)
      expect(result.offset).toBe(0)
      // Tri desc : l'interaction (30/07) avant la commande (29/07)
      expect(result.entries[0]).toMatchObject({
        kind: 'interaction',
        type: 'NOTE',
        titre: 'Note',
        detail: 'Rappeler lundi',
        auteur: 'Admin A',
      })
      expect(result.entries[1]?.kind).toBe('commande')
      expect(result.entries[1]?.titre).toMatch(/Commande #abcdef · 12.500 FCFA · PAID/)
    })

    it('paginates in memory via limit/offset', async () => {
      mockUserFindUnique.mockResolvedValue({ id: U1 })
      mockInteractionFindMany.mockResolvedValue([
        {
          id: 'i1',
          type: 'NOTE',
          details: null,
          meta: null,
          createdAt: new Date('2026-07-30T10:00:00Z'),
          author: { name: null },
        },
        {
          id: 'i2',
          type: 'APPEL',
          details: null,
          meta: null,
          createdAt: new Date('2026-07-29T10:00:00Z'),
          author: { name: null },
        },
        {
          id: 'i3',
          type: 'VISITE',
          details: null,
          meta: null,
          createdAt: new Date('2026-07-28T10:00:00Z'),
          author: { name: null },
        },
      ])
      mockOrderFindMany.mockResolvedValue([])
      mockDisputeFindMany.mockResolvedValue([])
      mockReturnFindMany.mockResolvedValue([])
      mockReviewFindMany.mockResolvedValue([])
      mockPartRequestFindMany.mockResolvedValue([])

      const result = await getCrmTimeline('USER', U1, { limit: 2, offset: 1 })

      expect(result.total).toBe(3)
      expect(result.entries.map((e) => e.refId)).toEqual(['i2', 'i3'])
    })

    it('scopes vendor activity via order items and labels reviews as received', async () => {
      mockVendorFindUnique.mockResolvedValue({ id: V1 })
      mockInteractionFindMany.mockResolvedValue([])
      mockOrderFindMany.mockResolvedValue([
        {
          id: 'bbbbbb1111111111',
          status: 'COMPLETED',
          totalAmount: 4500,
          createdAt: new Date('2026-07-20T10:00:00Z'),
        },
      ])
      mockDisputeFindMany.mockResolvedValue([
        {
          id: 'd1',
          status: 'OPEN',
          reason: 'Pièce défectueuse',
          createdAt: new Date('2026-07-21T10:00:00Z'),
        },
      ])
      mockReviewFindMany.mockResolvedValue([
        { id: 'r1', rating: 4, comment: 'Bien', createdAt: new Date('2026-07-22T10:00:00Z') },
      ])

      const result = await getCrmTimeline('VENDOR', V1, {})

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { items: { some: { vendorId: V1 } } } }),
      )
      expect(mockDisputeFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { order: { items: { some: { vendorId: V1 } } } } }),
      )
      expect(result.total).toBe(3)
      expect(result.entries.map((e) => e.kind)).toEqual(['avis', 'litige', 'commande'])
      expect(result.entries[0]?.titre).toBe('Avis reçu · 4/5')
      expect(result.entries[2]?.titre).toMatch(/Commande #bbbbbb · 4.500 FCFA · COMPLETED/)
    })
  })

  describe('addCrmInteraction', () => {
    it('rejects with CRM_TARGET_NOT_FOUND for an unknown subject', async () => {
      mockUserFindUnique.mockResolvedValue(null)
      await expect(
        addCrmInteraction(ADMIN, { subject: 'USER', subjectId: U1, type: 'NOTE' }),
      ).rejects.toMatchObject({ code: 'CRM_TARGET_NOT_FOUND', statusCode: 404 })
      expect(mockInteractionCreate).not.toHaveBeenCalled()
    })

    it('creates the interaction with the author id', async () => {
      mockVendorFindUnique.mockResolvedValue({ id: V1 })
      mockInteractionCreate.mockResolvedValue({ id: 'i1' })

      await addCrmInteraction(ADMIN, {
        subject: 'VENDOR',
        subjectId: V1,
        type: 'APPEL',
        details: 'OK',
      })

      expect(mockInteractionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subject: 'VENDOR',
            subjectId: V1,
            type: 'APPEL',
            details: 'OK',
            authorId: ADMIN,
          }),
        }),
      )
    })
  })

  describe('createCrmTask', () => {
    it('rejects an assignee outside the Pièces team', async () => {
      mockUserFindUnique
        .mockResolvedValueOnce({ id: U1 }) // cible
        .mockResolvedValueOnce({ id: ASSIGNEE, roles: ['BUYER'] }) // assigné

      await expect(
        createCrmTask(ADMIN, {
          subject: 'USER',
          subjectId: U1,
          titre: 'Rappeler',
          assigneeId: ASSIGNEE,
        }),
      ).rejects.toMatchObject({ code: 'CRM_INVALID_ASSIGNEE', statusCode: 422 })
      expect(mockTaskCreate).not.toHaveBeenCalled()
    })

    it('accepts an ADMIN assignee', async () => {
      mockUserFindUnique
        .mockResolvedValueOnce({ id: U1 })
        .mockResolvedValueOnce({ id: ASSIGNEE, roles: ['ADMIN'] })
      mockTaskCreate.mockResolvedValue({ id: TASK1 })

      await createCrmTask(ADMIN, {
        subject: 'USER',
        subjectId: U1,
        titre: 'Rappeler',
        assigneeId: ASSIGNEE,
      })

      expect(mockTaskCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ assigneeId: ASSIGNEE, createdById: ADMIN }),
        }),
      )
    })
  })

  describe('updateCrmTask', () => {
    it('rejects with CRM_TASK_NOT_FOUND when the task does not exist', async () => {
      mockTaskFindUnique.mockResolvedValue(null)
      await expect(updateCrmTask(TASK1, { titre: 'x' })).rejects.toMatchObject({
        code: 'CRM_TASK_NOT_FOUND',
        statusCode: 404,
      })
    })

    it('sets faitAt when transitioning to FAIT', async () => {
      mockTaskFindUnique.mockResolvedValue({ id: TASK1, statut: 'A_FAIRE' })
      mockTaskUpdate.mockResolvedValue({ id: TASK1, statut: 'FAIT' })

      await updateCrmTask(TASK1, { statut: 'FAIT' })

      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ statut: 'FAIT', faitAt: expect.any(Date) }),
        }),
      )
    })

    it('resets faitAt when going back to A_FAIRE', async () => {
      mockTaskFindUnique.mockResolvedValue({ id: TASK1, statut: 'FAIT' })
      mockTaskUpdate.mockResolvedValue({ id: TASK1, statut: 'A_FAIRE' })

      await updateCrmTask(TASK1, { statut: 'A_FAIRE' })

      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ statut: 'A_FAIRE', faitAt: null }),
        }),
      )
    })

    it('resets rappelEnvoyeAt when the due date changes', async () => {
      mockTaskFindUnique.mockResolvedValue({ id: TASK1, statut: 'A_FAIRE' })
      mockTaskUpdate.mockResolvedValue({ id: TASK1 })

      await updateCrmTask(TASK1, { echeanceLe: '2026-08-01T07:00:00.000Z' })

      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            echeanceLe: new Date('2026-08-01T07:00:00.000Z'),
            rappelEnvoyeAt: null,
          }),
        }),
      )
    })
  })

  describe('assignCrmTag', () => {
    it('upserts on the composite id (idempotent)', async () => {
      mockTagFindUnique.mockResolvedValue({ id: TAG1 })
      mockUserFindUnique.mockResolvedValue({ id: U1 })
      mockTagAssignUpsert.mockResolvedValue({
        tagId: TAG1,
        subject: 'USER',
        subjectId: U1,
        tag: { nom: 'VIP' },
      })

      await assignCrmTag(TAG1, { subject: 'USER', subjectId: U1 })

      expect(mockTagAssignUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tagId_subject_subjectId: { tagId: TAG1, subject: 'USER', subjectId: U1 } },
          create: { tagId: TAG1, subject: 'USER', subjectId: U1 },
          update: {},
        }),
      )
    })

    it('rejects with CRM_TAG_NOT_FOUND when the tag does not exist', async () => {
      mockTagFindUnique.mockResolvedValue(null)
      await expect(assignCrmTag(TAG1, { subject: 'USER', subjectId: U1 })).rejects.toMatchObject({
        code: 'CRM_TAG_NOT_FOUND',
        statusCode: 404,
      })
      expect(mockTagAssignUpsert).not.toHaveBeenCalled()
    })
  })

  describe('sendCrmRelance', () => {
    it('sends and logs a RELANCE interaction with meta.sent', async () => {
      mockUserFindUnique.mockResolvedValue({
        phone: '+2250700000000',
        notificationPreference: { whatsapp: true },
      })
      mockNotify.mockResolvedValue({ sent: true, channel: 'cloud' })
      mockInteractionCreate.mockResolvedValue({ id: 'i1' })

      const result = await sendCrmRelance(ADMIN, {
        subject: 'USER',
        subjectId: U1,
        message: 'Bonjour, on vous rappelle',
      })

      expect(mockNotify).toHaveBeenCalledWith('+2250700000000', 'Bonjour, on vous rappelle')
      expect(mockInteractionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subject: 'USER',
            subjectId: U1,
            type: 'RELANCE',
            details: 'Bonjour, on vous rappelle',
            meta: { sent: true, channel: 'cloud' },
            authorId: ADMIN,
          }),
        }),
      )
      expect(result).toEqual({ sent: true, channel: 'cloud' })
    })

    it('logs the interaction even when the send fails', async () => {
      mockUserFindUnique.mockResolvedValue({
        phone: '+2250700000000',
        notificationPreference: null,
      })
      mockNotify.mockResolvedValue({ sent: false, channel: null })
      mockInteractionCreate.mockResolvedValue({ id: 'i1' })

      const result = await sendCrmRelance(ADMIN, {
        subject: 'USER',
        subjectId: U1,
        message: 'Test',
      })

      expect(mockInteractionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ meta: { sent: false, channel: null } }),
        }),
      )
      expect(result).toEqual({ sent: false, channel: null })
    })

    it('rejects with CRM_OPTOUT when WhatsApp notifications are disabled', async () => {
      mockUserFindUnique.mockResolvedValue({
        phone: '+2250700000000',
        notificationPreference: { whatsapp: false },
      })

      await expect(
        sendCrmRelance(ADMIN, { subject: 'USER', subjectId: U1, message: 'Test' }),
      ).rejects.toMatchObject({ code: 'CRM_OPTOUT', statusCode: 422 })
      expect(mockNotify).not.toHaveBeenCalled()
      expect(mockInteractionCreate).not.toHaveBeenCalled()
    })

    it('rejects with CRM_NO_PHONE when the user has no phone', async () => {
      mockUserFindUnique.mockResolvedValue({ phone: null, notificationPreference: null })

      await expect(
        sendCrmRelance(ADMIN, { subject: 'USER', subjectId: U1, message: 'Test' }),
      ).rejects.toMatchObject({ code: 'CRM_NO_PHONE', statusCode: 422 })
      expect(mockNotify).not.toHaveBeenCalled()
    })

    it('checks opt-out on the linked user account for a VENDOR', async () => {
      mockVendorFindUnique.mockResolvedValue({
        phone: '+2250102030405',
        userId: U1,
        user: { notificationPreference: { whatsapp: false } },
      })

      await expect(
        sendCrmRelance(ADMIN, { subject: 'VENDOR', subjectId: V1, message: 'Test' }),
      ).rejects.toMatchObject({ code: 'CRM_OPTOUT', statusCode: 422 })
      expect(mockNotify).not.toHaveBeenCalled()
    })

    it('sends to the vendor phone when the linked user has not opted out', async () => {
      mockVendorFindUnique.mockResolvedValue({
        phone: '+2250102030405',
        userId: null,
        user: null,
      })
      mockNotify.mockResolvedValue({ sent: true, channel: 'baileys' })
      mockInteractionCreate.mockResolvedValue({ id: 'i1' })

      const result = await sendCrmRelance(ADMIN, {
        subject: 'VENDOR',
        subjectId: V1,
        message: 'Complétez votre fiche',
      })

      expect(mockNotify).toHaveBeenCalledWith('+2250102030405', 'Complétez votre fiche')
      expect(result).toEqual({ sent: true, channel: 'baileys' })
    })
  })
})
