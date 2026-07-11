import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')
vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')

const mockEnrichmentCreate = vi.fn()
const mockEnrichmentUpdate = vi.fn()
const mockEnrichmentFindUnique = vi.fn()
const mockEnrichmentFindFirst = vi.fn()
const mockEnrichmentFindMany = vi.fn()
const mockEnrichmentCount = vi.fn()
const mockVendorFindUnique = vi.fn()
const mockCatalogItemCreate = vi.fn()
const mockActivityLogCreate = vi.fn()
const mockJobCreate = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    partEnrichment: {
      create: (...args: unknown[]) => mockEnrichmentCreate(...args),
      update: (...args: unknown[]) => mockEnrichmentUpdate(...args),
      findUnique: (...args: unknown[]) => mockEnrichmentFindUnique(...args),
      findFirst: (...args: unknown[]) => mockEnrichmentFindFirst(...args),
      findMany: (...args: unknown[]) => mockEnrichmentFindMany(...args),
      count: (...args: unknown[]) => mockEnrichmentCount(...args),
    },
    vendor: {
      findUnique: (...args: unknown[]) => mockVendorFindUnique(...args),
    },
    catalogItem: {
      create: (...args: unknown[]) => mockCatalogItemCreate(...args),
    },
    activityLog: {
      create: (...args: unknown[]) => mockActivityLogCreate(...args),
    },
    job: {
      create: (...args: unknown[]) => mockJobCreate(...args),
    },
  },
}))

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn(async (key: string) => `https://r2.test/${key}`),
}))

vi.mock('../../lib/imageProcessor.js', () => ({
  processVariants: vi.fn(async () => ({
    thumb: Buffer.from('t'),
    small: Buffer.from('s'),
    medium: Buffer.from('m'),
    large: Buffer.from('l'),
  })),
}))

vi.mock('../../lib/perceptualHash.js', () => ({
  dHash: vi.fn(async () => 'abcdef0123456789'),
}))

vi.mock('sharp', () => ({
  default: () => ({
    rotate: () => ({
      resize: () => ({
        jpeg: () => ({ toBuffer: async () => Buffer.from('jpeg-2000px') }),
      }),
    }),
  }),
}))

const mockRunIdentificationPass = vi.fn()
const mockRunCompatibilityPass = vi.fn()
const mockGenerateFleetDescription = vi.fn()
vi.mock('./enrichment.agent.js', () => ({
  runIdentificationPass: (...args: unknown[]) => mockRunIdentificationPass(...args),
  runCompatibilityPass: (...args: unknown[]) => mockRunCompatibilityPass(...args),
  generateFleetDescription: (...args: unknown[]) => mockGenerateFleetDescription(...args),
}))

const {
  createEnrichment,
  getEnrichment,
  completeEnrichment,
  moderateEnrichment,
  arbitrateEnrichment,
  runFitmentsForEnrichment,
  serializeEnrichment,
  getQualitySheetForPart,
} = await import('./enrichment.service.js')

const liaison = { userId: 'liaison-1', role: 'LIAISON' as const }
const seller = { userId: 'seller-1', role: 'SELLER' as const }

const photos = [
  { buffer: Buffer.from('photo1'), mimeType: 'image/jpeg', fileName: 'etiquette.jpg' },
  { buffer: Buffer.from('photo2'), mimeType: 'image/jpeg', fileName: 'piece.jpg' },
  { buffer: Buffer.from('photo3'), mimeType: 'image/jpeg', fileName: 'emballage.jpg' },
]

const pass1Ok = {
  statut: 'ok',
  photo_feedback: null,
  identification: {
    marque_fabricant: { valeur: 'NGK', confiance: 0.97 },
    reference_fabricant: { valeur: 'BKR6E-11', confiance: 0.95 },
    references_oem: [{ constructeur: 'Suzuki', reference: '09482-00607', confiance: 0.9 }],
    ean: { valeur: null, confiance: 0 },
    pays_origine: { valeur: 'Japon', confiance: 0.8 },
    normes: [],
    caracteristiques: { ecartement: '1.1 mm' },
  },
  classification: { categorie: 'Allumage', sous_categorie: "Bougies d'allumage", confiance: 0.98 },
  authenticite: {
    score: 8,
    signaux_positifs: [{ signal: 'gravure laser nette', photo: 2 }],
    signaux_negatifs: [],
    justification: 'Marquages conformes',
    verification_recommandee: false,
  },
  confiance_globale: 0.91,
}

function enrichmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'enr-1',
    partId: null,
    origine: 'LIAISON',
    statut: 'BROUILLON',
    identification: pass1Ok.identification,
    classification: pass1Ok.classification,
    photoFeedback: null,
    authenticite: pass1Ok.authenticite,
    fitments: null,
    sourcing: null,
    sourcingBatchId: null,
    noteQualite: null,
    descriptionIndependante: null,
    livrablesApprouvesAt: null,
    confianceGlobale: 0.91,
    photos: ['https://r2.test/a.jpg'],
    photoHashes: ['abcdef0123456789'],
    photosVariants: [{ urlOriginal: 'https://r2.test/a.jpg', urlThumb: 'https://r2.test/a_thumb.webp' }],
    prix: null,
    stockQuantite: null,
    warrantyValue: null,
    warrantyUnit: null,
    liaisonId: 'liaison-1',
    vendeurId: null,
    fournisseurVisite: null,
    corrections: null,
    tentatives: 1,
    contentValidatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    validatedAt: null,
    ...overrides,
  }
}

describe('enrichment.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnrichmentCount.mockResolvedValue(0)
    mockEnrichmentFindFirst.mockResolvedValue(null)
    mockActivityLogCreate.mockResolvedValue({})
    mockJobCreate.mockResolvedValue({ id: 'job-1' })
  })

  describe('createEnrichment (passe 1)', () => {
    it('crée une fiche brouillon Liaison et déclenche la passe 2 quand la référence OEM est fiable', async () => {
      mockRunIdentificationPass.mockResolvedValue(pass1Ok)
      mockEnrichmentCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(enrichmentRow(data)),
      )

      const result = await createEnrichment(liaison, photos, {})

      expect(mockRunIdentificationPass).toHaveBeenCalledOnce()
      expect(mockEnrichmentCreate).toHaveBeenCalledOnce()
      const created = mockEnrichmentCreate.mock.calls[0][0].data
      expect(created.origine).toBe('LIAISON')
      expect(created.statut).toBe('BROUILLON')
      expect(created.liaisonId).toBe('liaison-1')
      // Passe 2 planifiée (référence OEM à 0.9 ≥ 0.7)
      expect(mockJobCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'ENRICHMENT_FITMENTS' }),
        }),
      )
      expect((result as { statut: string }).statut).toBe('BROUILLON')
    })

    it('met la fiche vendeur en file de modération', async () => {
      mockVendorFindUnique.mockResolvedValue({ id: 'vendor-1' })
      mockRunIdentificationPass.mockResolvedValue(pass1Ok)
      mockEnrichmentCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(enrichmentRow({ ...data, origine: 'VENDEUR' })),
      )

      await createEnrichment(seller, photos, {})

      const created = mockEnrichmentCreate.mock.calls[0][0].data
      expect(created.origine).toBe('VENDEUR')
      expect(created.statut).toBe('EN_MODERATION')
      expect(created.vendeurId).toBe('vendor-1')
      expect(created.liaisonId).toBeNull()
    })

    it('photos insuffisantes : brouillon avec consigne, pas de passe 2', async () => {
      mockRunIdentificationPass.mockResolvedValue({
        statut: 'photos_insuffisantes',
        photo_feedback: 'Reprends l\'étiquette de plus près, la référence est floue',
        identification: null,
        classification: null,
        authenticite: null,
        confiance_globale: null,
      })
      mockEnrichmentCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(enrichmentRow(data)),
      )

      await createEnrichment(liaison, photos, {})

      const created = mockEnrichmentCreate.mock.calls[0][0].data
      expect(created.statut).toBe('BROUILLON')
      expect(created.photoFeedback).toMatch(/étiquette/)
      expect(mockJobCreate).not.toHaveBeenCalled()
    })

    it('rejette moins de 2 photos', async () => {
      await expect(createEnrichment(liaison, photos.slice(0, 1), {})).rejects.toMatchObject({
        code: 'ENRICHMENT_PHOTO_COUNT',
      })
    })

    it('applique la limite de débit vendeur (100 fiches/jour)', async () => {
      mockVendorFindUnique.mockResolvedValue({ id: 'vendor-1' })
      mockEnrichmentCount.mockResolvedValue(100)

      await expect(createEnrichment(seller, photos, {})).rejects.toMatchObject({
        code: 'ENRICHMENT_RATE_LIMITED',
      })
    })

    it('réutilisation de photos d\'un autre compte : fiche flaguée en modération + journal', async () => {
      mockVendorFindUnique.mockResolvedValue({ id: 'vendor-1' })
      mockEnrichmentFindFirst.mockResolvedValue({ id: 'enr-autre' })
      mockRunIdentificationPass.mockResolvedValue(pass1Ok)
      mockEnrichmentCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(enrichmentRow(data)),
      )

      await createEnrichment(seller, photos, {})

      const created = mockEnrichmentCreate.mock.calls[0][0].data
      expect(created.statut).toBe('EN_MODERATION')
      expect(mockActivityLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'ENRICHMENT_PHOTO_REUSE' }),
        }),
      )
    })

    it('catégorie hors taxonomie : reclassée a_classer côté serveur', async () => {
      mockRunIdentificationPass.mockResolvedValue({
        ...pass1Ok,
        classification: { categorie: 'Turbomachines spatiales', sous_categorie: null, confiance: 0.9 },
      })
      mockEnrichmentCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(enrichmentRow(data)),
      )

      await createEnrichment(liaison, photos, {})

      const created = mockEnrichmentCreate.mock.calls[0][0].data
      expect((created.classification as { categorie: string }).categorie).toBe('a_classer')
    })

    it('503 si l\'agent est indisponible', async () => {
      mockRunIdentificationPass.mockResolvedValue(null)
      await expect(createEnrichment(liaison, photos, {})).rejects.toMatchObject({
        code: 'ENRICHMENT_AGENT_UNAVAILABLE',
      })
    })
  })

  describe('cloisonnement par rôle (spec §8)', () => {
    it('les champs sensibles sont ABSENTS (pas null) hors admin', () => {
      const row = enrichmentRow({ noteQualite: 8, sourcing: { fournisseurs: [] } })

      const forLiaison = serializeEnrichment(row as never, 'LIAISON') as Record<string, unknown>
      expect('authenticite' in forLiaison).toBe(false)
      expect('sourcing' in forLiaison).toBe(false)
      expect('noteQualite' in forLiaison).toBe(false)
      expect('descriptionIndependante' in forLiaison).toBe(false)
      expect('tentatives' in forLiaison).toBe(false)
      expect('corrections' in forLiaison).toBe(false)

      const forVendor = serializeEnrichment(row as never, 'SELLER') as Record<string, unknown>
      expect('authenticite' in forVendor).toBe(false)
      expect('sourcing' in forVendor).toBe(false)

      const forAdmin = serializeEnrichment(row as never, 'ADMIN') as Record<string, unknown>
      expect(forAdmin.authenticite).toBeTruthy()
      expect(forAdmin.noteQualite).toBe(8)
    })

    it('statuts génériques : BLOQUE se lit « en vérification » hors admin', () => {
      const blocked = enrichmentRow({ statut: 'BLOQUE' })
      expect((serializeEnrichment(blocked as never, 'SELLER') as { statut: string }).statut).toBe('EN_VERIFICATION')
      expect((serializeEnrichment(blocked as never, 'LIAISON') as { statut: string }).statut).toBe('EN_VERIFICATION')
      expect((serializeEnrichment(blocked as never, 'ADMIN') as { statut: string }).statut).toBe('BLOQUE')
    })

    it('inspection : tâche visible du Liaison sans motif, « en vérification » pour le vendeur', () => {
      const inspection = enrichmentRow({ statut: 'A_VERIFIER' })
      expect((serializeEnrichment(inspection as never, 'LIAISON') as { statut: string }).statut).toBe('INSPECTION_PROGRAMMEE')
      expect((serializeEnrichment(inspection as never, 'SELLER') as { statut: string }).statut).toBe('EN_VERIFICATION')
    })

    it('le vendeur n\'accède pas à la fiche d\'un autre vendeur', async () => {
      mockEnrichmentFindUnique.mockResolvedValue(enrichmentRow({ origine: 'VENDEUR', vendeurId: 'vendor-2' }))
      mockVendorFindUnique.mockResolvedValue({ id: 'vendor-1' })

      await expect(getEnrichment(seller, 'enr-1')).rejects.toMatchObject({
        code: 'ENRICHMENT_FORBIDDEN',
      })
    })
  })

  describe('completeEnrichment', () => {
    it('journalise les corrections humaines', async () => {
      mockEnrichmentFindUnique.mockResolvedValue(enrichmentRow())
      mockEnrichmentUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(enrichmentRow(data)),
      )

      await completeEnrichment(liaison, 'enr-1', {
        prix: 4500,
        corrections: { referenceOem: '09482-00607-CORR' },
      })

      const updated = mockEnrichmentUpdate.mock.calls[0][0].data
      expect(updated.prix).toBe(4500)
      const corrections = updated.corrections as { entries: Array<{ valeurs: Record<string, string> }> }
      expect(corrections.entries).toHaveLength(1)
      expect(corrections.entries[0].valeurs.referenceOem).toBe('09482-00607-CORR')
    })
  })

  describe('moderateEnrichment', () => {
    it('VALIDER_CONTENU : la fiche part en arbitrage admin', async () => {
      mockEnrichmentFindUnique.mockResolvedValue(enrichmentRow())
      mockEnrichmentUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(enrichmentRow(data)),
      )

      await moderateEnrichment(liaison, 'enr-1', { action: 'VALIDER_CONTENU' })

      const updated = mockEnrichmentUpdate.mock.calls[0][0].data
      expect(updated.statut).toBe('EN_MODERATION')
      expect(updated.contentValidatedAt).toBeInstanceOf(Date)
    })

    it('DEMANDER_PHOTOS : retour brouillon avec consigne', async () => {
      mockEnrichmentFindUnique.mockResolvedValue(
        enrichmentRow({ origine: 'VENDEUR', statut: 'EN_MODERATION', vendeurId: 'vendor-1', liaisonId: null }),
      )
      mockEnrichmentUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(enrichmentRow(data)),
      )

      await moderateEnrichment(liaison, 'enr-1', {
        action: 'DEMANDER_PHOTOS',
        commentaire: 'Photo de la pièce nue manquante',
      })

      const updated = mockEnrichmentUpdate.mock.calls[0][0].data
      expect(updated.statut).toBe('BROUILLON')
      expect(updated.photoFeedback).toMatch(/pièce nue/)
    })

    it('refuse au vendeur', async () => {
      await expect(moderateEnrichment(seller as never, 'enr-1', { action: 'VALIDER_CONTENU' })).rejects.toMatchObject({
        code: 'ENRICHMENT_FORBIDDEN',
      })
    })
  })

  describe('arbitrateEnrichment (admin)', () => {
    it('score ≤ 4 : approbation refusée tant qu\'aucune inspection n\'a eu lieu', async () => {
      mockEnrichmentFindUnique.mockResolvedValue(
        enrichmentRow({
          statut: 'EN_MODERATION',
          contentValidatedAt: new Date(),
          authenticite: { ...pass1Ok.authenticite, score: 3 },
        }),
      )

      await expect(
        arbitrateEnrichment('admin-1', 'enr-1', { decision: 'APPROUVER' }),
      ).rejects.toMatchObject({ code: 'ENRICHMENT_INSPECTION_REQUIRED' })
    })

    it('score ≤ 4 depuis A_VERIFIER (post-inspection) : approbation possible', async () => {
      mockEnrichmentFindUnique.mockResolvedValue(
        enrichmentRow({
          statut: 'A_VERIFIER',
          contentValidatedAt: new Date(),
          prix: 4500,
          vendeurId: 'vendor-1',
          authenticite: { ...pass1Ok.authenticite, score: 4 },
        }),
      )
      mockCatalogItemCreate.mockResolvedValue({ id: 'item-1' })
      mockEnrichmentUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(enrichmentRow(data)),
      )

      const result = await arbitrateEnrichment('admin-1', 'enr-1', { decision: 'APPROUVER' })

      expect((result as { statutBrut: string }).statutBrut).toBe('VALIDE')
    })

    it('APPROUVER exige la validation de contenu préalable', async () => {
      mockEnrichmentFindUnique.mockResolvedValue(enrichmentRow({ statut: 'EN_MODERATION' }))

      await expect(
        arbitrateEnrichment('admin-1', 'enr-1', { decision: 'APPROUVER' }),
      ).rejects.toMatchObject({ code: 'ENRICHMENT_CONTENT_NOT_VALIDATED' })
    })

    it('APPROUVER publie le CatalogItem avec fitments ≥ 0.7 uniquement', async () => {
      mockEnrichmentFindUnique.mockResolvedValue(
        enrichmentRow({
          statut: 'EN_MODERATION',
          contentValidatedAt: new Date(),
          prix: 4500,
          stockQuantite: 12,
          vendeurId: 'vendor-1',
          fitments: [
            { marque: 'Suzuki', modele: 'Alto', annees: '2014-2023', motorisation: '0.8 F8D', confiance: 0.9, sources: ['https://x'] },
            { marque: 'Kia', modele: 'Picanto', annees: '2011-2017', motorisation: null, confiance: 0.6, sources: ['https://y'] },
          ],
        }),
      )
      mockCatalogItemCreate.mockResolvedValue({ id: 'item-1' })
      mockEnrichmentUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(enrichmentRow(data)),
      )

      await arbitrateEnrichment('admin-1', 'enr-1', { decision: 'APPROUVER', publierLivrables: false })

      expect(mockCatalogItemCreate).toHaveBeenCalledOnce()
      const item = mockCatalogItemCreate.mock.calls[0][0].data
      expect(item.vendorId).toBe('vendor-1')
      expect(item.price).toBe(4500)
      expect(item.status).toBe('PUBLISHED')
      expect(item.category).toBe("Allumage / Bougies d'allumage")
      // Le fitment à 0.6 reste « à confirmer », jamais publié tel quel (spec §7)
      const fitments = item.fitments.create as Array<{ brand: string; yearFrom: number | null }>
      expect(fitments).toHaveLength(1)
      expect(fitments[0]).toMatchObject({ brand: 'Suzuki', yearFrom: 2014, yearTo: 2023 })
      // partId rattaché à la fiche
      expect(mockEnrichmentUpdate.mock.calls[0][0].data.partId).toBe('item-1')
    })

    it('INSPECTION : statut A_VERIFIER, motif journalisé côté admin seulement', async () => {
      mockEnrichmentFindUnique.mockResolvedValue(enrichmentRow({ statut: 'EN_MODERATION' }))
      mockEnrichmentUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(enrichmentRow(data)),
      )

      await arbitrateEnrichment('admin-1', 'enr-1', {
        decision: 'INSPECTION',
        commentaire: 'Hologramme suspect photo 3',
      })

      expect(mockEnrichmentUpdate.mock.calls[0][0].data.statut).toBe('A_VERIFIER')
      expect(mockActivityLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'ENRICHMENT_INSPECTION_REQUESTED' }),
        }),
      )
    })
  })

  describe('runFitmentsForEnrichment (passe 2)', () => {
    it('stocke les fitments retournés par l\'agent', async () => {
      mockEnrichmentFindUnique.mockResolvedValue(enrichmentRow())
      mockRunCompatibilityPass.mockResolvedValue({
        statut: 'ok',
        fitments: [
          { marque: 'Suzuki', modele: 'Alto', annees: '2014-2023', motorisation: '0.8 F8D', confiance: 0.9, sources: ['https://x'] },
        ],
      })
      mockEnrichmentUpdate.mockResolvedValue(enrichmentRow())

      await runFitmentsForEnrichment('enr-1')

      expect(mockRunCompatibilityPass).toHaveBeenCalledWith(
        expect.objectContaining({
          reference_fabricant: 'BKR6E-11',
          references_oem: [{ constructeur: 'Suzuki', reference: '09482-00607' }],
        }),
        undefined,
      )
      expect(mockEnrichmentUpdate).toHaveBeenCalledOnce()
    })

    it('relance le job si l\'agent est indisponible', async () => {
      mockEnrichmentFindUnique.mockResolvedValue(enrichmentRow())
      mockRunCompatibilityPass.mockResolvedValue(null)

      await expect(runFitmentsForEnrichment('enr-1')).rejects.toMatchObject({
        code: 'ENRICHMENT_PASS2_UNAVAILABLE',
      })
    })
  })

  describe('getQualitySheetForPart (restitution flotte)', () => {
    it('renvoie note + description après approbation admin', async () => {
      mockEnrichmentFindFirst.mockResolvedValue({
        noteQualite: 8,
        descriptionIndependante: 'Bougie d\'allumage NGK…',
        validatedAt: new Date(),
      })

      const sheet = await getQualitySheetForPart('item-1')
      expect(sheet.noteQualite).toBe(8)
      expect(sheet.description).toMatch(/NGK/)
    })

    it('404 tant que les livrables ne sont pas approuvés', async () => {
      mockEnrichmentFindFirst.mockResolvedValue(null)
      await expect(getQualitySheetForPart('item-1')).rejects.toMatchObject({
        code: 'QUALITY_SHEET_NOT_FOUND',
      })
    })
  })
})
