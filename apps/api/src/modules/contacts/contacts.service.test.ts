import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockContactFindUnique = vi.fn()
const mockContactFindMany = vi.fn()
const mockContactUpdate = vi.fn()
const mockContactCount = vi.fn()
const mockContactGroupBy = vi.fn()
const mockActivityFindMany = vi.fn()
const mockActivityCount = vi.fn()
const mockUserFindFirst = vi.fn()
const mockUserFindMany = vi.fn()
const mockVendorFindFirst = vi.fn()

const txActivityCreate = vi.fn()
const txContactUpdate = vi.fn()
const txVendorCreate = vi.fn()
const tx = {
  contactActivity: { create: (...args: unknown[]) => txActivityCreate(...args) },
  vendorContact: { update: (...args: unknown[]) => txContactUpdate(...args) },
  vendor: { create: (...args: unknown[]) => txVendorCreate(...args) },
}

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    vendorContact: {
      findUnique: (...args: unknown[]) => mockContactFindUnique(...args),
      findMany: (...args: unknown[]) => mockContactFindMany(...args),
      update: (...args: unknown[]) => mockContactUpdate(...args),
      count: (...args: unknown[]) => mockContactCount(...args),
      groupBy: (...args: unknown[]) => mockContactGroupBy(...args),
    },
    contactActivity: {
      findMany: (...args: unknown[]) => mockActivityFindMany(...args),
      count: (...args: unknown[]) => mockActivityCount(...args),
    },
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
    vendor: {
      findFirst: (...args: unknown[]) => mockVendorFindFirst(...args),
    },
    $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  },
}))

const {
  addActivity,
  listActivities,
  assignContact,
  convertContactToVendor,
  getProspectionStats,
  getTodayRelances,
} = await import('./contacts.service.js')

describe('contacts.service — prospection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addActivity', () => {
    it('rejects when contact does not exist', async () => {
      mockContactFindUnique.mockResolvedValue(null)
      await expect(addActivity('user-1', 'ghost', { type: 'APPEL' })).rejects.toMatchObject({
        code: 'CONTACT_NOT_FOUND',
      })
    })

    it('rejects invalid activity type', async () => {
      await expect(addActivity('user-1', 'c1', { type: 'DANSE' })).rejects.toMatchObject({
        code: 'VALIDATION',
      })
    })

    it('records statut transition and updates the contact', async () => {
      mockContactFindUnique.mockResolvedValue({ id: 'c1', statut: 'A_CONTACTER' })
      txActivityCreate.mockResolvedValue({ id: 'a1', type: 'APPEL' })
      txContactUpdate.mockResolvedValue({ id: 'c1', statut: 'APPELE' })

      const result = await addActivity('user-1', 'c1', {
        type: 'APPEL',
        note: 'Intéressé, rappeler demain',
        statut: 'APPELE',
        relanceLe: '2026-07-18T08:00:00.000Z',
      })

      expect(txActivityCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contactId: 'c1',
            authorId: 'user-1',
            type: 'APPEL',
            note: 'Intéressé, rappeler demain',
            statutAvant: 'A_CONTACTER',
            statutApres: 'APPELE',
          }),
        }),
      )
      expect(txContactUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statut: 'APPELE',
            relanceLe: new Date('2026-07-18T08:00:00.000Z'),
          }),
        }),
      )
      expect(result).toEqual({ activity: { id: 'a1', type: 'APPEL' }, contact: { id: 'c1', statut: 'APPELE' } })
    })

    it('does not record a statut transition when statut is unchanged', async () => {
      mockContactFindUnique.mockResolvedValue({ id: 'c1', statut: 'APPELE' })
      txActivityCreate.mockResolvedValue({ id: 'a1' })
      txContactUpdate.mockResolvedValue({ id: 'c1' })

      await addActivity('user-1', 'c1', { type: 'NOTE', statut: 'APPELE' })

      expect(txActivityCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ statutAvant: null, statutApres: null }),
        }),
      )
    })

    it('stamps derniereVisite for VISITE activities', async () => {
      mockContactFindUnique.mockResolvedValue({ id: 'c1', statut: 'APPELE' })
      txActivityCreate.mockResolvedValue({ id: 'a1' })
      txContactUpdate.mockResolvedValue({ id: 'c1' })

      await addActivity('user-1', 'c1', { type: 'VISITE' })

      expect(txContactUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ derniereVisite: expect.any(Date) }),
        }),
      )
    })
  })

  describe('listActivities', () => {
    it('rejects when contact does not exist', async () => {
      mockContactFindUnique.mockResolvedValue(null)
      await expect(listActivities('ghost')).rejects.toMatchObject({ code: 'CONTACT_NOT_FOUND' })
    })

    it('returns activities newest first', async () => {
      mockContactFindUnique.mockResolvedValue({ id: 'c1' })
      mockActivityFindMany.mockResolvedValue([{ id: 'a2' }, { id: 'a1' }])
      const result = await listActivities('c1')
      expect(result).toHaveLength(2)
      expect(mockActivityFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      )
    })
  })

  describe('assignContact', () => {
    it('rejects unknown liaison', async () => {
      mockContactFindUnique.mockResolvedValue({ id: 'c1' })
      mockUserFindFirst.mockResolvedValue(null)
      await expect(assignContact('c1', { liaisonId: 'ghost' })).rejects.toMatchObject({
        code: 'LIAISON_NOT_FOUND',
      })
    })

    it('assigns and logs an ASSIGNATION activity', async () => {
      mockContactFindUnique.mockResolvedValue({ id: 'c1' })
      mockUserFindFirst.mockResolvedValue({ name: 'Awa Diabaté', phone: '+2250700000001' })
      mockContactUpdate.mockResolvedValue({ id: 'c1', liaisonId: 'l1' })

      const result = await assignContact('c1', { liaisonId: 'l1' })

      expect(mockUserFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'l1', roles: { has: 'LIAISON' } } }),
      )
      expect(mockContactUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            liaisonId: 'l1',
            activites: { create: expect.objectContaining({ type: 'ASSIGNATION', note: 'Assigné à Awa Diabaté' }) },
          }),
        }),
      )
      expect(result).toEqual({ id: 'c1', liaisonId: 'l1' })
    })

    it('allows unassigning with liaisonId null', async () => {
      mockContactFindUnique.mockResolvedValue({ id: 'c1' })
      mockContactUpdate.mockResolvedValue({ id: 'c1', liaisonId: null })

      await assignContact('c1', { liaisonId: null })

      expect(mockUserFindFirst).not.toHaveBeenCalled()
      expect(mockContactUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            liaisonId: null,
            activites: { create: expect.objectContaining({ note: 'Assignation retirée' }) },
          }),
        }),
      )
    })
  })

  describe('convertContactToVendor', () => {
    const contact = {
      id: 'c1',
      name: 'Ibrahim Koné',
      shopName: 'Stand Adjamé',
      phone: '+2250700000000',
      commune: 'Adjamé',
      address: 'Marché central',
      lat: 5.36,
      lng: -4.02,
      liaisonId: 'l1',
      vendorId: null,
      statut: 'VISITE',
    }

    it('rejects when contact is already linked to a vendor', async () => {
      mockContactFindUnique.mockResolvedValue({ ...contact, vendorId: 'v9' })
      await expect(convertContactToVendor('user-1', 'c1', {})).rejects.toMatchObject({
        code: 'CONTACT_ALREADY_CONVERTED',
      })
    })

    it('creates a vendor managed by the assigned liaison', async () => {
      mockContactFindUnique.mockResolvedValue(contact)
      mockVendorFindFirst.mockResolvedValue(null)
      txVendorCreate.mockResolvedValue({ id: 'v1' })
      txContactUpdate.mockResolvedValue({ id: 'c1', vendorId: 'v1', statut: 'CONCLU' })

      const result = await convertContactToVendor('admin-1', 'c1', { vendorType: 'INFORMAL' })

      expect(txVendorCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shopName: 'Stand Adjamé',
            contactName: 'Ibrahim Koné',
            phone: '+2250700000000',
            vendorType: 'INFORMAL',
            status: 'PENDING_ACTIVATION',
            managedByLiaisonId: 'l1',
          }),
        }),
      )
      expect(txContactUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vendorId: 'v1',
            statut: 'CONCLU',
            activites: { create: expect.objectContaining({ type: 'CONVERSION' }) },
          }),
        }),
      )
      expect(result.vendorId).toBe('v1')
    })

    it('links an existing vendor with the same phone instead of duplicating', async () => {
      mockContactFindUnique.mockResolvedValue(contact)
      mockVendorFindFirst.mockResolvedValue({ id: 'v-exist', shopName: 'Garage Momo' })
      txContactUpdate.mockResolvedValue({ id: 'c1', vendorId: 'v-exist', statut: 'CONCLU' })

      const result = await convertContactToVendor('admin-1', 'c1', {})

      expect(txVendorCreate).not.toHaveBeenCalled()
      expect(result.vendorId).toBe('v-exist')
    })
  })

  describe('getProspectionStats', () => {
    it('aggregates funnel, communes and liaison performance', async () => {
      mockContactGroupBy
        .mockResolvedValueOnce([{ statut: 'A_CONTACTER', _count: { _all: 5 } }])
        .mockResolvedValueOnce([{ commune: 'Adjamé', _count: { _all: 3 } }, { commune: null, _count: { _all: 2 } }])
        .mockResolvedValueOnce([{ liaisonId: 'l1', _count: { _all: 4 } }, { liaisonId: null, _count: { _all: 1 } }])
        .mockResolvedValueOnce([{ liaisonId: 'l1', _count: { _all: 2 } }])
      mockContactCount.mockResolvedValueOnce(5).mockResolvedValueOnce(2)
      mockActivityCount.mockResolvedValue(7)
      mockUserFindMany.mockResolvedValue([{ id: 'l1', name: 'Awa', phone: null }])

      const stats = await getProspectionStats()

      expect(stats.total).toBe(5)
      expect(stats.converted).toBe(2)
      expect(stats.recentActivities).toBe(7)
      expect(stats.byStatut).toEqual([{ statut: 'A_CONTACTER', count: 5 }])
      expect(stats.byCommune[0]).toEqual({ commune: 'Adjamé', count: 3 })
      expect(stats.byLiaison).toContainEqual({ liaisonId: 'l1', liaisonName: 'Awa', count: 4, conclu: 2 })
      expect(stats.byLiaison).toContainEqual({ liaisonId: null, liaisonName: null, count: 1, conclu: 0 })
    })
  })

  describe('getTodayRelances', () => {
    it('filters by liaison and includes overdue relances', async () => {
      mockContactFindMany.mockResolvedValue([])
      await getTodayRelances('l1')
      const args = mockContactFindMany.mock.calls[0][0] as {
        where: { liaisonId?: string; relanceLe: { lt: Date } }
      }
      expect(args.where.liaisonId).toBe('l1')
      expect(args.where.relanceLe.lt).toBeInstanceOf(Date)
    })

    it('returns all liaisons when no filter is given (admin)', async () => {
      mockContactFindMany.mockResolvedValue([])
      await getTodayRelances()
      const args = mockContactFindMany.mock.calls[0][0] as { where: { liaisonId?: string } }
      expect(args.where.liaisonId).toBeUndefined()
    })
  })
})
