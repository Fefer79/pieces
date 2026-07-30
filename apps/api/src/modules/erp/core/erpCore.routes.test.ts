import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const { createPrismaMock } = await import('../../../test/prismaMock.js')
const { prismaMock, model, resetAll } = createPrismaMock()

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()

vi.mock('../../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}))

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }))

vi.mock('../../../lib/r2.js', () => ({
  uploadToR2: vi.fn(),
  downloadFromR2: vi.fn(),
  getPublicUrl: vi.fn(),
}))

const { buildApp } = await import('../../../server.js')

/**
 * Authentifie la requête suivante. `roles` pilote l'amorçage ADMIN, `staff` la
 * fiche d'équipe trouvée par `loadStaffContext`.
 */
function mockAuth(
  roles: string[] = ['ADMIN'],
  staff: { id: string; staffRole: string; active?: boolean } | null = null,
) {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: 'sup-1', phone: '+2250700000000' } },
    error: null,
  })
  mockUserUpsert.mockResolvedValueOnce({
    id: 'user-1',
    phone: '+2250700000000',
    email: null,
    roles,
    activeContext: roles[0],
    consentedAt: new Date(),
  })
  model('user').upsert.mockImplementation((...args: unknown[]) => mockUserUpsert(...args))
  model('staffMember').findUnique.mockResolvedValueOnce(
    staff
      ? {
          id: staff.id,
          staffRole: staff.staffRole,
          businessUnits: ['MARKETPLACE'],
          title: null,
          active: staff.active ?? true,
        }
      : null,
  )
  return { authorization: 'Bearer test-token' }
}

describe('ERP core routes', () => {
  beforeEach(() => {
    resetAll()
    mockGetUser.mockReset()
    mockUserUpsert.mockReset()
  })

  describe('GET /api/v1/erp/me', () => {
    it('refuse sans jeton', async () => {
      const app = buildApp()
      const res = await app.inject({ method: 'GET', url: '/api/v1/erp/me' })
      expect(res.statusCode).toBe(401)
    })

    it('répond 200 avec toutes les capacités pour un ADMIN sans fiche (amorçage)', async () => {
      const headers = mockAuth(['ADMIN'], null)
      const app = buildApp()
      const res = await app.inject({ method: 'GET', url: '/api/v1/erp/me', headers })

      expect(res.statusCode).toBe(200)
      const data = res.json().data
      expect(data.isPlatformAdmin).toBe(true)
      expect(data.staffId).toBeNull()
      expect(data.capabilities).toContain('accounting:post')
      expect(data.capabilities).toContain('erp:admin')
    })

    it('répond 200 avec zéro capacité pour un utilisateur hors équipe', async () => {
      // 200 et non 403 : c'est ce qui permet au front de distinguer « pas
      // connecté » de « connecté mais pas de l'équipe ».
      const headers = mockAuth(['BUYER'], null)
      const app = buildApp()
      const res = await app.inject({ method: 'GET', url: '/api/v1/erp/me', headers })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.capabilities).toEqual([])
    })

    it('renvoie les capacités du métier pour un membre de l’équipe', async () => {
      const headers = mockAuth(['BUYER'], { id: 'staff-1', staffRole: 'COMPTABLE' })
      const app = buildApp()
      const res = await app.inject({ method: 'GET', url: '/api/v1/erp/me', headers })

      const data = res.json().data
      expect(data.staffId).toBe('staff-1')
      expect(data.staffRoleLabel).toBe('Comptable')
      expect(data.capabilities).toContain('accounting:close')
      expect(data.capabilities).not.toContain('stock:move')
    })

    it('n’accorde rien à un membre désactivé', async () => {
      const headers = mockAuth(['BUYER'], {
        id: 'staff-1',
        staffRole: 'DIRECTION',
        active: false,
      })
      const app = buildApp()
      const res = await app.inject({ method: 'GET', url: '/api/v1/erp/me', headers })
      expect(res.json().data.capabilities).toEqual([])
    })
  })

  describe('garde par capacité', () => {
    it('refuse le cockpit à un utilisateur hors équipe', async () => {
      const headers = mockAuth(['BUYER'], null)
      const app = buildApp()
      const res = await app.inject({ method: 'GET', url: '/api/v1/erp/cockpit', headers })

      expect(res.statusCode).toBe(403)
      expect(res.json().error.code).toBe('ERP_FORBIDDEN')
    })

    it('refuse l’enrôlement à un comptable (erp:admin requis)', async () => {
      const headers = mockAuth(['BUYER'], { id: 'staff-1', staffRole: 'COMPTABLE' })
      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/erp/staff',
        headers,
        payload: {
          userId: '11111111-1111-1111-1111-111111111111',
          staffRole: 'COMMERCIAL',
        },
      })

      expect(res.statusCode).toBe(403)
      expect(res.json().error.details.required).toBe('erp:admin')
    })

    it('autorise l’enrôlement par la direction', async () => {
      const headers = mockAuth(['BUYER'], { id: 'staff-1', staffRole: 'DIRECTION' })
      model('user').findUnique.mockResolvedValueOnce({ id: 'user-2' })
      model('staffMember').findUnique.mockResolvedValueOnce(null)
      model('staffMember').create.mockResolvedValueOnce({
        id: 'staff-2',
        userId: 'user-2',
        staffRole: 'COMMERCIAL',
        businessUnits: [],
        title: null,
        active: true,
        hiredAt: null,
        createdAt: new Date(),
        user: { id: 'user-2', name: 'Awa', phone: null, email: null, roles: ['BUYER'] },
      })

      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/erp/staff',
        headers,
        payload: {
          userId: '11111111-1111-1111-1111-111111111111',
          staffRole: 'COMMERCIAL',
        },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().data.id).toBe('staff-2')
    })

    it('refuse un doublon d’enrôlement', async () => {
      const headers = mockAuth(['ADMIN'], null)
      model('user').findUnique.mockResolvedValueOnce({ id: 'user-2' })
      model('staffMember').findUnique.mockResolvedValueOnce({ id: 'staff-existant' })

      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/erp/staff',
        headers,
        payload: {
          userId: '11111111-1111-1111-1111-111111111111',
          staffRole: 'COMMERCIAL',
        },
      })

      expect(res.statusCode).toBe(409)
      expect(res.json().error.code).toBe('ERP_STAFF_ALREADY_EXISTS')
    })

    it('renvoie 404 si l’utilisateur à enrôler n’existe pas', async () => {
      const headers = mockAuth(['ADMIN'], null)
      model('user').findUnique.mockResolvedValueOnce(null)

      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/erp/staff',
        headers,
        payload: {
          userId: '11111111-1111-1111-1111-111111111111',
          staffRole: 'COMMERCIAL',
        },
      })

      expect(res.statusCode).toBe(404)
      expect(res.json().error.code).toBe('USER_NOT_FOUND')
    })

    it('rejette un métier inconnu en 422', async () => {
      const headers = mockAuth(['ADMIN'], null)
      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/erp/staff',
        headers,
        payload: {
          userId: '11111111-1111-1111-1111-111111111111',
          staffRole: 'GRAND_CHEF',
        },
      })

      expect(res.statusCode).toBe(422)
      expect(res.json().error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('tâches', () => {
    it('liste les tâches d’un membre', async () => {
      const headers = mockAuth(['BUYER'], { id: 'staff-1', staffRole: 'COMMERCIAL' })
      model('task').findMany.mockResolvedValueOnce([
        {
          id: 't1',
          title: 'Relancer Garage Koumassi',
          description: null,
          status: 'OPEN',
          priority: 'HIGH',
          dueAt: null,
          businessUnit: 'MARKETPLACE',
          relatedType: null,
          relatedId: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          assignee: null,
          createdBy: null,
        },
      ])
      model('task').count.mockResolvedValueOnce(1)

      const app = buildApp()
      const res = await app.inject({ method: 'GET', url: '/api/v1/erp/tasks?mine=true', headers })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.items).toHaveLength(1)
      expect(res.json().data.total).toBe(1)
    })

    it('renvoie une liste vide pour « mes tâches » sans fiche d’équipe', async () => {
      // Un ADMIN plateforme non enrôlé n'a aucune tâche attribuable : on évite
      // un filtre `assigneeStaffId: null` qui remonterait toutes les tâches
      // orphelines de l'équipe.
      const headers = mockAuth(['ADMIN'], null)
      const app = buildApp()
      const res = await app.inject({ method: 'GET', url: '/api/v1/erp/tasks?mine=true', headers })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.items).toEqual([])
      expect(model('task').findMany).not.toHaveBeenCalled()
    })

    it('exige une fiche d’équipe pour créer une tâche', async () => {
      // Une tâche doit être imputable : sans fiche, on refuse plutôt que de
      // créer un enregistrement sans auteur.
      const headers = mockAuth(['ADMIN'], null)
      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/erp/tasks',
        headers,
        payload: { title: 'Appeler la DGI' },
      })

      expect(res.statusCode).toBe(409)
      expect(res.json().error.code).toBe('ERP_STAFF_PROFILE_REQUIRED')
    })

    it('assigne la tâche à son créateur par défaut', async () => {
      const headers = mockAuth(['BUYER'], { id: 'staff-1', staffRole: 'COMMERCIAL' })
      model('task').create.mockResolvedValueOnce({ id: 't2' })

      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/erp/tasks',
        headers,
        payload: { title: 'Appeler la DGI' },
      })

      expect(res.statusCode).toBe(201)
      const createArg = model('task').create.mock.calls[0]?.[0] as {
        data: { assigneeStaffId: string; createdByStaffId: string }
      }
      expect(createArg.data.assigneeStaffId).toBe('staff-1')
      expect(createArg.data.createdByStaffId).toBe('staff-1')
    })

    it('refuse un rattachement incomplet', async () => {
      const headers = mockAuth(['BUYER'], { id: 'staff-1', staffRole: 'COMMERCIAL' })
      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/erp/tasks',
        headers,
        payload: { title: 'Vérifier le RIB', relatedType: 'Vendor' },
      })

      // Règle composite : `zodToFastify` perd les `.refine()`, donc le service
      // doit la faire respecter.
      expect(res.statusCode).toBe(422)
      expect(res.json().error.details.message).toMatch(/type et un identifiant/)
    })

    it('rejette un titre trop court en 422', async () => {
      const headers = mockAuth(['BUYER'], { id: 'staff-1', staffRole: 'COMMERCIAL' })
      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/erp/tasks',
        headers,
        payload: { title: 'ok' },
      })
      expect(res.statusCode).toBe(422)
    })

    it('horodate la clôture côté serveur', async () => {
      const headers = mockAuth(['BUYER'], { id: 'staff-1', staffRole: 'COMMERCIAL' })
      model('task').findUnique.mockResolvedValueOnce({ id: 't1', status: 'OPEN' })
      model('task').update.mockResolvedValueOnce({ id: 't1' })

      const app = buildApp()
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/erp/tasks/t1',
        headers,
        payload: { status: 'DONE' },
      })

      expect(res.statusCode).toBe(200)
      const arg = model('task').update.mock.calls[0]?.[0] as {
        data: { completedAt?: Date }
      }
      expect(arg.data.completedAt).toBeInstanceOf(Date)
    })

    it('efface la date de clôture à la réouverture', async () => {
      const headers = mockAuth(['BUYER'], { id: 'staff-1', staffRole: 'COMMERCIAL' })
      model('task').findUnique.mockResolvedValueOnce({ id: 't1', status: 'DONE' })
      model('task').update.mockResolvedValueOnce({ id: 't1' })

      const app = buildApp()
      await app.inject({
        method: 'PATCH',
        url: '/api/v1/erp/tasks/t1',
        headers,
        payload: { status: 'OPEN' },
      })

      const arg = model('task').update.mock.calls[0]?.[0] as { data: { completedAt?: null } }
      expect(arg.data.completedAt).toBeNull()
    })

    it('renvoie 404 sur une tâche inconnue', async () => {
      const headers = mockAuth(['BUYER'], { id: 'staff-1', staffRole: 'COMMERCIAL' })
      model('task').findUnique.mockResolvedValueOnce(null)

      const app = buildApp()
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/erp/tasks/inconnue',
        headers,
        payload: { status: 'DONE' },
      })

      expect(res.statusCode).toBe(404)
      expect(res.json().error.code).toBe('ERP_TASK_NOT_FOUND')
    })

    it('refuse d’assigner une tâche à un membre désactivé', async () => {
      const headers = mockAuth(['BUYER'], { id: 'staff-1', staffRole: 'COMMERCIAL' })
      model('staffMember').findUnique.mockResolvedValueOnce({ id: 'staff-9', active: false })

      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/erp/tasks',
        headers,
        payload: { title: 'Contrôler le stock', assigneeStaffId: 'staff-9' },
      })

      expect(res.statusCode).toBe(409)
      expect(res.json().error.code).toBe('ERP_STAFF_INACTIVE')
    })
  })

  describe('cockpit', () => {
    it('agrège les indicateurs des lignes d’activité', async () => {
      const headers = mockAuth(['ADMIN'], null)
      model('invoice').aggregate
        .mockResolvedValueOnce({
          _sum: { totalTtc: 1_200_000, subtotalHt: 1_016_949, tvaAmount: 183_051 },
          _count: { _all: 4 },
        })
        .mockResolvedValueOnce({ _sum: { totalTtc: 1_000_000 } })
      model('invoice').findMany.mockResolvedValueOnce([])
      model('order').count.mockResolvedValue(3)
      model('logisticsQuoteRequest').count.mockResolvedValue(7)
      model('enterpriseSubscription').count.mockResolvedValue(2)
      model('vehicle').count.mockResolvedValue(41)
      model('vendorContact').count.mockResolvedValue(12)
      model('vendor').count.mockResolvedValue(30)
      model('enterprise').count.mockResolvedValue(5)
      model('task').count.mockResolvedValue(0)

      const app = buildApp()
      const res = await app.inject({ method: 'GET', url: '/api/v1/erp/cockpit', headers })

      expect(res.statusCode).toBe(200)
      const data = res.json().data
      expect(data.ventes.caMois).toBe(1_200_000)
      expect(data.ventes.panierMoyen).toBe(300_000)
      // (1 200 000 - 1 000 000) / 1 000 000 = +20 %
      expect(data.ventes.evolutionPct).toBe(20)
      expect(data.serieCa).toHaveLength(6)
    })

    it('ne calcule pas d’évolution quand le mois précédent est vide', async () => {
      const headers = mockAuth(['ADMIN'], null)
      model('invoice').aggregate
        .mockResolvedValueOnce({
          _sum: { totalTtc: 500_000, subtotalHt: 423_729, tvaAmount: 76_271 },
          _count: { _all: 2 },
        })
        .mockResolvedValueOnce({ _sum: { totalTtc: null } })
      model('invoice').findMany.mockResolvedValueOnce([])
      for (const m of [
        'order',
        'logisticsQuoteRequest',
        'enterpriseSubscription',
        'vehicle',
        'vendorContact',
        'vendor',
        'enterprise',
        'task',
      ] as const) {
        model(m).count.mockResolvedValue(0)
      }

      const app = buildApp()
      const res = await app.inject({ method: 'GET', url: '/api/v1/erp/cockpit', headers })

      // Une croissance « infinie » n'informe personne : on renvoie null.
      expect(res.json().data.ventes.evolutionPct).toBeNull()
    })

    it('respecte le nombre de mois demandé', async () => {
      const headers = mockAuth(['ADMIN'], null)
      model('invoice').aggregate
        .mockResolvedValueOnce({ _sum: {}, _count: { _all: 0 } })
        .mockResolvedValueOnce({ _sum: {} })
      model('invoice').findMany.mockResolvedValueOnce([])
      for (const m of [
        'order',
        'logisticsQuoteRequest',
        'enterpriseSubscription',
        'vehicle',
        'vendorContact',
        'vendor',
        'enterprise',
        'task',
      ] as const) {
        model(m).count.mockResolvedValue(0)
      }

      const app = buildApp()
      const res = await app.inject({ method: 'GET', url: '/api/v1/erp/cockpit?months=3', headers })
      expect(res.json().data.serieCa).toHaveLength(3)
    })

    it('rejette un nombre de mois hors bornes en 422', async () => {
      const headers = mockAuth(['ADMIN'], null)
      const app = buildApp()
      const res = await app.inject({ method: 'GET', url: '/api/v1/erp/cockpit?months=99', headers })
      expect(res.statusCode).toBe(422)
    })
  })

  describe('notes', () => {
    it('exige un rattachement', async () => {
      const headers = mockAuth(['BUYER'], { id: 'staff-1', staffRole: 'COMMERCIAL' })
      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/erp/notes',
        headers,
        payload: { body: 'RIB reçu par WhatsApp' },
      })
      expect(res.statusCode).toBe(422)
    })

    it('signe la note du membre courant', async () => {
      const headers = mockAuth(['BUYER'], { id: 'staff-1', staffRole: 'COMMERCIAL' })
      model('note').create.mockResolvedValueOnce({ id: 'n1' })

      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/erp/notes',
        headers,
        payload: { body: 'RIB reçu', relatedType: 'Vendor', relatedId: 'v1' },
      })

      expect(res.statusCode).toBe(201)
      const arg = model('note').create.mock.calls[0]?.[0] as {
        data: { authorStaffId: string }
      }
      expect(arg.data.authorStaffId).toBe('staff-1')
    })
  })
})
