import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mechanicFindUnique = vi.fn()
const mechanicFindMany = vi.fn()
const mechanicCount = vi.fn()
const mechanicCreate = vi.fn()
const mechanicUpdate = vi.fn()
const mechanicReviewFindUnique = vi.fn()
const mechanicReviewFindFirst = vi.fn()
const mechanicReviewFindMany = vi.fn()
const mechanicReviewCount = vi.fn()
const mechanicReviewCreate = vi.fn()
const mechanicReviewUpdate = vi.fn()
const mechanicSuggestionFindUnique = vi.fn()
const mechanicSuggestionFindMany = vi.fn()
const mechanicSuggestionCount = vi.fn()
const mechanicSuggestionCreate = vi.fn()
const mechanicSuggestionUpdate = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    mechanic: {
      findUnique: (...a: unknown[]) => mechanicFindUnique(...a),
      findMany: (...a: unknown[]) => mechanicFindMany(...a),
      count: (...a: unknown[]) => mechanicCount(...a),
      create: (...a: unknown[]) => mechanicCreate(...a),
      update: (...a: unknown[]) => mechanicUpdate(...a),
    },
    mechanicReview: {
      findUnique: (...a: unknown[]) => mechanicReviewFindUnique(...a),
      findFirst: (...a: unknown[]) => mechanicReviewFindFirst(...a),
      findMany: (...a: unknown[]) => mechanicReviewFindMany(...a),
      count: (...a: unknown[]) => mechanicReviewCount(...a),
      create: (...a: unknown[]) => mechanicReviewCreate(...a),
      update: (...a: unknown[]) => mechanicReviewUpdate(...a),
    },
    mechanicSuggestion: {
      findUnique: (...a: unknown[]) => mechanicSuggestionFindUnique(...a),
      findMany: (...a: unknown[]) => mechanicSuggestionFindMany(...a),
      count: (...a: unknown[]) => mechanicSuggestionCount(...a),
      create: (...a: unknown[]) => mechanicSuggestionCreate(...a),
      update: (...a: unknown[]) => mechanicSuggestionUpdate(...a),
    },
  },
}))

const {
  registerMechanic,
  getMyMechanic,
  getMechanic,
  updateMechanic,
  searchMechanics,
  suspendMechanic,
  reinstateMechanic,
  createMechanicReview,
  listMechanicReviews,
  hideMechanicReview,
  suggestMechanic,
  listMechanicSuggestions,
  approveMechanicSuggestion,
  rejectMechanicSuggestion,
} = await import('./mechanic.service.js')

const BASE_INPUT = {
  name: 'Garage Koffi',
  phone: '+2250700000010',
  commune: 'Yopougon',
  specialties: ['Mécanique générale'] as const,
}

describe('mechanic.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('registerMechanic', () => {
    it("refuse une deuxième fiche pour le même utilisateur", async () => {
      mechanicFindUnique.mockResolvedValueOnce({ id: 'mech-1' })

      await expect(registerMechanic('user-1', { ...BASE_INPUT, specialties: [...BASE_INPUT.specialties] })).rejects.toMatchObject({
        code: 'MECHANIC_ALREADY_EXISTS',
        statusCode: 409,
      })
    })

    it('refuse un numéro déjà utilisé par une autre fiche', async () => {
      mechanicFindUnique.mockResolvedValueOnce(null) // pas de fiche pour ce user
      mechanicFindUnique.mockResolvedValueOnce({ id: 'mech-2' }) // téléphone déjà pris

      await expect(registerMechanic('user-1', { ...BASE_INPUT, specialties: [...BASE_INPUT.specialties] })).rejects.toMatchObject({
        code: 'MECHANIC_PHONE_TAKEN',
        statusCode: 409,
      })
    })

    it('crée la fiche avec userId et statut ACTIVE implicite (défaut Prisma)', async () => {
      mechanicFindUnique.mockResolvedValueOnce(null)
      mechanicFindUnique.mockResolvedValueOnce(null)
      mechanicCreate.mockResolvedValueOnce({ id: 'mech-1', ...BASE_INPUT })

      const result = await registerMechanic('user-1', { ...BASE_INPUT, specialties: [...BASE_INPUT.specialties] })

      expect(result.id).toBe('mech-1')
      expect(mechanicCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'user-1', name: 'Garage Koffi', phone: BASE_INPUT.phone }),
      })
    })
  })

  describe('getMyMechanic', () => {
    it('404 sans fiche', async () => {
      mechanicFindUnique.mockResolvedValueOnce(null)
      await expect(getMyMechanic('user-1')).rejects.toMatchObject({
        code: 'MECHANIC_NOT_FOUND',
        statusCode: 404,
      })
    })
  })

  describe('getMechanic (public)', () => {
    it('404 sur une fiche suspendue (jamais exposée publiquement)', async () => {
      mechanicFindUnique.mockResolvedValueOnce({ id: 'mech-1', status: 'SUSPENDED' })
      await expect(getMechanic('mech-1')).rejects.toMatchObject({ code: 'MECHANIC_NOT_FOUND' })
    })

    it('renvoie une fiche active', async () => {
      mechanicFindUnique.mockResolvedValueOnce({ id: 'mech-1', status: 'ACTIVE' })
      const result = await getMechanic('mech-1')
      expect(result.id).toBe('mech-1')
    })
  })

  describe('updateMechanic', () => {
    it('autorise le propriétaire', async () => {
      mechanicFindUnique.mockResolvedValueOnce({ id: 'mech-1', userId: 'user-1' })
      mechanicUpdate.mockResolvedValueOnce({ id: 'mech-1', name: 'Nouveau nom' })

      const result = await updateMechanic({ id: 'user-1', roles: ['BUYER'] }, 'mech-1', { name: 'Nouveau nom' })
      expect(result.name).toBe('Nouveau nom')
    })

    it('autorise un LIAISON même non propriétaire', async () => {
      mechanicFindUnique.mockResolvedValueOnce({ id: 'mech-1', userId: 'someone-else' })
      mechanicUpdate.mockResolvedValueOnce({ id: 'mech-1' })

      await expect(
        updateMechanic({ id: 'liaison-1', roles: ['LIAISON'] }, 'mech-1', { name: 'X' }),
      ).resolves.toBeDefined()
    })

    it('refuse un tiers sans rôle staff', async () => {
      mechanicFindUnique.mockResolvedValueOnce({ id: 'mech-1', userId: 'someone-else' })

      await expect(
        updateMechanic({ id: 'user-2', roles: ['BUYER'] }, 'mech-1', { name: 'X' }),
      ).rejects.toMatchObject({ code: 'MECHANIC_FORBIDDEN', statusCode: 403 })
    })
  })

  describe('searchMechanics', () => {
    it('filtre par commune sans coordonnées, trié par note', async () => {
      mechanicFindMany.mockResolvedValueOnce([{ id: 'mech-1' }])
      mechanicCount.mockResolvedValueOnce(1)

      const result = await searchMechanics({ commune: 'Yopougon' })

      expect(result).toEqual({ mechanics: [{ id: 'mech-1' }], total: 1, page: 1, limit: 20 })
      expect(mechanicFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE', commune: 'Yopougon' },
          orderBy: [{ avgRating: 'desc' }, { reviewCount: 'desc' }],
        }),
      )
    })

    it('filtre géo par bounding-box puis rayon exact (haversine)', async () => {
      // Abidjan ~5.3°N. Un candidat à ~2km (dans le rayon) et un à ~50km (hors rayon).
      mechanicFindMany.mockResolvedValueOnce([
        { id: 'near', lat: 5.32, lng: -4.02, status: 'ACTIVE' },
        { id: 'far', lat: 5.75, lng: -4.02, status: 'ACTIVE' },
      ])

      const result = await searchMechanics({ lat: 5.3, lng: -4.0, radiusKm: 10 })

      expect(result.mechanics.map((m) => m.id)).toEqual(['near'])
      expect(result.total).toBe(1)
    })

    it('pagine les résultats géo triés par distance', async () => {
      mechanicFindMany.mockResolvedValueOnce([
        { id: 'a', lat: 5.301, lng: -4.001, status: 'ACTIVE' },
        { id: 'b', lat: 5.305, lng: -4.005, status: 'ACTIVE' },
        { id: 'c', lat: 5.31, lng: -4.01, status: 'ACTIVE' },
      ])

      const result = await searchMechanics({ lat: 5.3, lng: -4.0, radiusKm: 10, page: 1, limit: 2 })

      expect(result.total).toBe(3)
      expect(result.mechanics).toHaveLength(2)
      expect(result.mechanics[0]!.id).toBe('a')
    })
  })

  describe('suspendMechanic / reinstateMechanic', () => {
    it('suspend avec motif et modérateur', async () => {
      mechanicFindUnique.mockResolvedValueOnce({ id: 'mech-1' })
      mechanicUpdate.mockResolvedValueOnce({ id: 'mech-1', status: 'SUSPENDED' })

      const result = await suspendMechanic('mech-1', 'staff-1', 'Signalement client')
      expect(result.status).toBe('SUSPENDED')
      expect(mechanicUpdate).toHaveBeenCalledWith({
        where: { id: 'mech-1' },
        data: expect.objectContaining({
          status: 'SUSPENDED',
          suspendedReason: 'Signalement client',
          moderatedById: 'staff-1',
        }),
      })
    })

    it('404 si la fiche n’existe pas', async () => {
      mechanicFindUnique.mockResolvedValueOnce(null)
      await expect(suspendMechanic('mech-x', 'staff-1', 'x')).rejects.toMatchObject({
        code: 'MECHANIC_NOT_FOUND',
      })
    })

    it('réactive une fiche suspendue', async () => {
      mechanicFindUnique.mockResolvedValueOnce({ id: 'mech-1' })
      mechanicUpdate.mockResolvedValueOnce({ id: 'mech-1', status: 'ACTIVE' })

      const result = await reinstateMechanic('mech-1', 'staff-1')
      expect(result.status).toBe('ACTIVE')
    })
  })

  describe('createMechanicReview', () => {
    it("404 sur une fiche inexistante ou suspendue", async () => {
      mechanicFindUnique.mockResolvedValueOnce(null)
      await expect(
        createMechanicReview('user-1', 'mech-x', { rating: 5 }),
      ).rejects.toMatchObject({ code: 'MECHANIC_NOT_FOUND' })
    })

    it('refuse un deuxième avis du même utilisateur', async () => {
      mechanicFindUnique.mockResolvedValueOnce({ id: 'mech-1', status: 'ACTIVE' })
      mechanicReviewFindFirst.mockResolvedValueOnce({ id: 'review-1' })

      await expect(
        createMechanicReview('user-1', 'mech-1', { rating: 4 }),
      ).rejects.toMatchObject({ code: 'MECHANIC_REVIEW_ALREADY_EXISTS', statusCode: 409 })
    })

    it('crée un avis et recalcule la note du mécanicien', async () => {
      mechanicFindUnique.mockResolvedValueOnce({ id: 'mech-1', status: 'ACTIVE' })
      mechanicReviewFindFirst.mockResolvedValueOnce(null)
      mechanicReviewCreate.mockResolvedValueOnce({ id: 'review-1', rating: 5, mechanicId: 'mech-1' })
      mechanicReviewFindMany.mockResolvedValueOnce([{ rating: 5 }])
      mechanicUpdate.mockResolvedValueOnce({})

      const result = await createMechanicReview('user-1', 'mech-1', { rating: 5, comment: 'Top' })

      expect(result.id).toBe('review-1')
      expect(mechanicReviewCreate).toHaveBeenCalledWith({
        data: { mechanicId: 'mech-1', reviewerId: 'user-1', rating: 5, comment: 'Top' },
      })
      await vi.waitFor(() =>
        expect(mechanicUpdate).toHaveBeenCalledWith({
          where: { id: 'mech-1' },
          data: { avgRating: 5, reviewCount: 1 },
        }),
      )
    })
  })

  describe('listMechanicReviews', () => {
    it('ne liste que les avis publiés, paginés', async () => {
      mechanicReviewFindMany.mockResolvedValueOnce([{ id: 'review-1' }])
      mechanicReviewCount.mockResolvedValueOnce(1)

      const result = await listMechanicReviews('mech-1', { page: 1, limit: 10 })

      expect(result).toEqual({ reviews: [{ id: 'review-1' }], total: 1, page: 1, limit: 10 })
      expect(mechanicReviewFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { mechanicId: 'mech-1', status: 'PUBLISHED' } }),
      )
    })
  })

  describe('hideMechanicReview', () => {
    it("404 si l'avis n'existe pas", async () => {
      mechanicReviewFindUnique.mockResolvedValueOnce(null)
      await expect(hideMechanicReview('review-x', 'staff-1')).rejects.toMatchObject({
        code: 'MECHANIC_REVIEW_NOT_FOUND',
      })
    })

    it('masque un avis et recalcule la note (sans lui)', async () => {
      mechanicReviewFindUnique.mockResolvedValueOnce({ id: 'review-1', mechanicId: 'mech-1' })
      mechanicReviewUpdate.mockResolvedValueOnce({ id: 'review-1', status: 'HIDDEN' })
      mechanicReviewFindMany.mockResolvedValueOnce([])
      mechanicUpdate.mockResolvedValueOnce({})

      const result = await hideMechanicReview('review-1', 'staff-1')

      expect(result.status).toBe('HIDDEN')
      expect(mechanicReviewUpdate).toHaveBeenCalledWith({
        where: { id: 'review-1' },
        data: { status: 'HIDDEN', moderatedById: 'staff-1' },
      })
      await vi.waitFor(() =>
        expect(mechanicUpdate).toHaveBeenCalledWith({
          where: { id: 'mech-1' },
          data: { avgRating: null, reviewCount: 0 },
        }),
      )
    })
  })

  describe('suggestMechanic', () => {
    it('crée une suggestion PENDING sans auteur si non authentifié', async () => {
      mechanicSuggestionCreate.mockResolvedValueOnce({ id: 'sugg-1', status: 'PENDING' })

      const result = await suggestMechanic(null, { name: 'Garage X', phone: '+2250700000099' })

      expect(result.id).toBe('sugg-1')
      expect(mechanicSuggestionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Garage X', phone: '+2250700000099', suggestedById: undefined }),
      })
    })
  })

  describe('listMechanicSuggestions', () => {
    it('filtre par statut PENDING par défaut', async () => {
      mechanicSuggestionFindMany.mockResolvedValueOnce([{ id: 'sugg-1' }])
      mechanicSuggestionCount.mockResolvedValueOnce(1)

      const result = await listMechanicSuggestions()

      expect(result).toEqual({ suggestions: [{ id: 'sugg-1' }], total: 1, page: 1, limit: 20 })
      expect(mechanicSuggestionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'PENDING' } }),
      )
    })
  })

  describe('approveMechanicSuggestion', () => {
    it('404 si la suggestion n’existe pas', async () => {
      mechanicSuggestionFindUnique.mockResolvedValueOnce(null)
      await expect(approveMechanicSuggestion('sugg-x', 'staff-1')).rejects.toMatchObject({
        code: 'MECHANIC_SUGGESTION_NOT_FOUND',
      })
    })

    it('409 si déjà modérée', async () => {
      mechanicSuggestionFindUnique.mockResolvedValueOnce({ id: 'sugg-1', status: 'APPROVED' })
      await expect(approveMechanicSuggestion('sugg-1', 'staff-1')).rejects.toMatchObject({
        code: 'MECHANIC_SUGGESTION_ALREADY_MODERATED',
        statusCode: 409,
      })
    })

    it('409 si le téléphone correspond déjà à une fiche existante', async () => {
      mechanicSuggestionFindUnique.mockResolvedValueOnce({
        id: 'sugg-1',
        status: 'PENDING',
        phone: '+2250700000099',
      })
      mechanicFindUnique.mockResolvedValueOnce({ id: 'mech-existing' })

      await expect(approveMechanicSuggestion('sugg-1', 'staff-1')).rejects.toMatchObject({
        code: 'MECHANIC_PHONE_TAKEN',
        statusCode: 409,
      })
    })

    it('crée la fiche mécanicien et marque la suggestion APPROVED', async () => {
      mechanicSuggestionFindUnique.mockResolvedValueOnce({
        id: 'sugg-1',
        status: 'PENDING',
        name: 'Garage X',
        phone: '+2250700000099',
        commune: 'Yopougon',
        address: null,
        specialty: 'Mécanique générale',
        note: 'Fiable',
      })
      mechanicFindUnique.mockResolvedValueOnce(null)
      mechanicCreate.mockResolvedValueOnce({ id: 'mech-new', name: 'Garage X' })
      mechanicSuggestionUpdate.mockResolvedValueOnce({ id: 'sugg-1', status: 'APPROVED' })

      const result = await approveMechanicSuggestion('sugg-1', 'staff-1')

      expect(result.mechanic.id).toBe('mech-new')
      expect(mechanicCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Garage X',
          phone: '+2250700000099',
          specialties: ['Mécanique générale'],
          createdByLiaisonId: 'staff-1',
          moderatedById: 'staff-1',
        }),
      })
      expect(mechanicSuggestionUpdate).toHaveBeenCalledWith({
        where: { id: 'sugg-1' },
        data: expect.objectContaining({ status: 'APPROVED', createdMechanicId: 'mech-new' }),
      })
    })
  })

  describe('rejectMechanicSuggestion', () => {
    it('404 si la suggestion n’existe pas', async () => {
      mechanicSuggestionFindUnique.mockResolvedValueOnce(null)
      await expect(rejectMechanicSuggestion('sugg-x', 'staff-1')).rejects.toMatchObject({
        code: 'MECHANIC_SUGGESTION_NOT_FOUND',
      })
    })

    it('rejette avec motif', async () => {
      mechanicSuggestionFindUnique.mockResolvedValueOnce({ id: 'sugg-1', status: 'PENDING' })
      mechanicSuggestionUpdate.mockResolvedValueOnce({ id: 'sugg-1', status: 'REJECTED' })

      const result = await rejectMechanicSuggestion('sugg-1', 'staff-1', 'Doublon')

      expect(result.status).toBe('REJECTED')
      expect(mechanicSuggestionUpdate).toHaveBeenCalledWith({
        where: { id: 'sugg-1' },
        data: expect.objectContaining({ status: 'REJECTED', rejectionReason: 'Doublon' }),
      })
    })
  })
})
