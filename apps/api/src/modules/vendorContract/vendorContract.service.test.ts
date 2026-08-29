import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')
vi.stubEnv('WEB_BASE_URL', 'https://pieces.ci')

const mockVendorFindUnique = vi.fn()
const mockContractCreate = vi.fn()
const mockContractFindUnique = vi.fn()
const mockContractFindFirst = vi.fn()
const mockContractFindMany = vi.fn()
const mockContractUpdate = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    vendor: {
      findUnique: (...args: unknown[]) => mockVendorFindUnique(...args),
    },
    vendorContract: {
      create: (...args: unknown[]) => mockContractCreate(...args),
      findUnique: (...args: unknown[]) => mockContractFindUnique(...args),
      findFirst: (...args: unknown[]) => mockContractFindFirst(...args),
      findMany: (...args: unknown[]) => mockContractFindMany(...args),
      update: (...args: unknown[]) => mockContractUpdate(...args),
    },
  },
}))

const {
  createVendorContract,
  listVendorContracts,
  getVendorContractByToken,
  acceptVendorContract,
} = await import('./vendorContract.service.js')
const { generateVendorContractPdf } = await import('./vendorContractPdf.service.js')
const { VENDOR_CONTRACT_VERSION } = await import('shared/contracts')

describe('vendorContract.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Par défaut : aucun contrat en attente pour le vendeur visé.
    mockContractFindFirst.mockResolvedValue(null)
  })

  describe('createVendorContract', () => {
    it('crée un contrat avec un token et renvoie une URL publique', async () => {
      mockContractCreate.mockResolvedValue({
        id: 'c1',
        token: 'abcdef0123456789',
        contractVersion: VENDOR_CONTRACT_VERSION,
        status: 'PENDING',
        sellerName: 'Koffi Auto',
        shopName: 'Garage Koffi',
        phone: null,
        createdAt: new Date(),
      })

      const result = await createVendorContract('admin-1', {
        sellerName: 'Koffi Auto',
        shopName: 'Garage Koffi',
      })

      expect(mockContractCreate).toHaveBeenCalledOnce()
      expect(result.url).toBe('https://pieces.ci/vendeur/contrat/abcdef0123456789')
      expect(result.contractVersion).toBe(VENDOR_CONTRACT_VERSION)
    })

    it('rejette si le vendeur rattaché est introuvable', async () => {
      mockVendorFindUnique.mockResolvedValue(null)
      await expect(
        createVendorContract('admin-1', {
          sellerName: 'X',
          vendorId: '00000000-0000-0000-0000-000000000000',
        }),
      ).rejects.toMatchObject({ code: 'VENDOR_NOT_FOUND', statusCode: 404 })
    })

    it("empêche une LIAISON de créer un contrat pour un vendeur qu'elle ne gère pas", async () => {
      mockVendorFindUnique.mockResolvedValue({ id: 'v1', managedByLiaisonId: 'other-liaison' })
      await expect(
        createVendorContract('liaison-1', { sellerName: 'X', vendorId: 'v1' }, ['LIAISON']),
      ).rejects.toMatchObject({ code: 'VENDOR_NOT_FOUND' })
      expect(mockContractCreate).not.toHaveBeenCalled()
    })

    it('autorise une LIAISON pour un vendeur qu’elle gère', async () => {
      mockVendorFindUnique.mockResolvedValue({ id: 'v1', managedByLiaisonId: 'liaison-1' })
      mockContractCreate.mockResolvedValue({
        id: 'c1', token: 'abcdef0123456789', contractVersion: VENDOR_CONTRACT_VERSION,
        status: 'PENDING', sellerName: 'X', shopName: null, phone: null, createdAt: new Date(),
      })
      const result = await createVendorContract('liaison-1', { sellerName: 'X', vendorId: 'v1' }, ['LIAISON'])
      expect(result.token).toBe('abcdef0123456789')
    })

    it('autorise un ADMIN pour n’importe quel vendeur', async () => {
      mockVendorFindUnique.mockResolvedValue({ id: 'v1', managedByLiaisonId: 'someone-else' })
      mockContractCreate.mockResolvedValue({
        id: 'c1', token: 'abcdef0123456789', contractVersion: VENDOR_CONTRACT_VERSION,
        status: 'PENDING', sellerName: 'X', shopName: null, phone: null, createdAt: new Date(),
      })
      const result = await createVendorContract('admin-1', { sellerName: 'X', vendorId: 'v1' }, ['ADMIN'])
      expect(result.token).toBe('abcdef0123456789')
    })

    it('réutilise le lien en attente d’un vendeur au lieu d’en créer un second', async () => {
      // Terrain : deux appuis sur « Générer le contrat » ne doivent pas laisser
      // deux liens vivants pour la même boutique.
      mockVendorFindUnique.mockResolvedValue({ id: 'v1', managedByLiaisonId: 'liaison-1' })
      mockContractFindFirst.mockResolvedValue({
        id: 'c0', token: 'deadbeefdeadbeef', contractVersion: VENDOR_CONTRACT_VERSION,
        status: 'PENDING', vendorId: 'v1', sellerName: 'X', shopName: null, phone: null,
        signedName: null, signedAt: null, createdAt: new Date(),
      })
      const result = await createVendorContract('liaison-1', { sellerName: 'X', vendorId: 'v1' }, ['LIAISON'])
      expect(mockContractCreate).not.toHaveBeenCalled()
      expect(result.url).toBe('https://pieces.ci/vendeur/contrat/deadbeefdeadbeef')
    })
  })

  describe('listVendorContracts', () => {
    it('restreint une liaison à ses contrats et à ses vendeurs', async () => {
      mockContractFindMany.mockResolvedValue([])
      await listVendorContracts('liaison-1', { scopeToCreator: true, vendorId: 'v1' })
      const where = mockContractFindMany.mock.calls[0][0].where
      expect(where.vendorId).toBe('v1')
      expect(where.OR).toEqual([
        { createdById: 'liaison-1' },
        { vendor: { managedByLiaisonId: 'liaison-1' } },
      ])
    })

    it('ne filtre pas pour un membre d’équipe habilité et expose l’URL publique', async () => {
      mockContractFindMany.mockResolvedValue([
        { id: 'c1', token: 'abcdef0123456789', contractVersion: VENDOR_CONTRACT_VERSION,
          status: 'ACCEPTED', vendorId: 'v1', sellerName: 'X', shopName: null, phone: null,
          signedName: 'X', signedAt: new Date(), createdAt: new Date() },
      ])
      const result = await listVendorContracts('commercial-1', { scopeToCreator: false })
      expect(mockContractFindMany.mock.calls[0][0].where.OR).toBeUndefined()
      expect(result[0].url).toBe('https://pieces.ci/vendeur/contrat/abcdef0123456789')
    })
  })

  describe('getVendorContractByToken', () => {
    it('renvoie le contrat + son contenu intégral', async () => {
      mockContractFindUnique.mockResolvedValue({
        token: 'tok',
        contractVersion: VENDOR_CONTRACT_VERSION,
        status: 'PENDING',
        sellerName: 'Koffi',
        shopName: null,
        phone: null,
        signedName: null,
        signedAt: null,
        createdAt: new Date(),
      })

      const result = await getVendorContractByToken('tok')
      expect(result.content.articles.length).toBeGreaterThan(0)
      expect(result.content.title).toMatch(/adhésion/i)
    })

    it('404 si le token est inconnu', async () => {
      mockContractFindUnique.mockResolvedValue(null)
      await expect(getVendorContractByToken('nope')).rejects.toMatchObject({
        code: 'CONTRACT_NOT_FOUND',
      })
    })
  })

  describe('acceptVendorContract', () => {
    it('signe un contrat PENDING et fige nom/date/IP', async () => {
      mockContractFindUnique.mockResolvedValue({ id: 'c1', status: 'PENDING' })
      mockContractUpdate.mockResolvedValue({
        token: 'tok',
        status: 'ACCEPTED',
        signedName: 'Koffi Yao',
        signedAt: new Date(),
        contractVersion: VENDOR_CONTRACT_VERSION,
      })

      const result = await acceptVendorContract(
        'tok',
        { signedName: 'Koffi Yao', accepted: true },
        { ip: '1.2.3.4', userAgent: 'jest' },
      )

      expect(result.status).toBe('ACCEPTED')
      const updateArg = mockContractUpdate.mock.calls[0][0]
      expect(updateArg.data.acceptedIp).toBe('1.2.3.4')
      expect(updateArg.data.signedName).toBe('Koffi Yao')
    })

    it('refuse de re-signer un contrat déjà accepté', async () => {
      mockContractFindUnique.mockResolvedValue({ id: 'c1', status: 'ACCEPTED' })
      await expect(
        acceptVendorContract('tok', { signedName: 'X', accepted: true }, {}),
      ).rejects.toMatchObject({ code: 'CONTRACT_ALREADY_ACCEPTED', statusCode: 409 })
    })

    it('refuse un contrat révoqué', async () => {
      mockContractFindUnique.mockResolvedValue({ id: 'c1', status: 'REVOKED' })
      await expect(
        acceptVendorContract('tok', { signedName: 'X', accepted: true }, {}),
      ).rejects.toMatchObject({ code: 'CONTRACT_REVOKED', statusCode: 410 })
    })
  })

  describe('generateVendorContractPdf', () => {
    it('produit un PDF (vierge) pour un contrat PENDING', async () => {
      mockContractFindUnique.mockResolvedValue({
        contractVersion: VENDOR_CONTRACT_VERSION,
        status: 'PENDING',
        sellerName: 'Koffi',
        shopName: 'Garage Koffi',
        phone: '+2250700000000',
        signedName: null,
        signedAt: null,
        acceptedIp: null,
        createdAt: new Date('2026-06-08'),
      })

      const pdf = await generateVendorContractPdf('tok')
      expect(Buffer.isBuffer(pdf)).toBe(true)
      expect(pdf.length).toBeGreaterThan(1000)
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    })

    it('produit un PDF signé pour un contrat ACCEPTED', async () => {
      mockContractFindUnique.mockResolvedValue({
        contractVersion: VENDOR_CONTRACT_VERSION,
        status: 'ACCEPTED',
        sellerName: 'Koffi',
        shopName: null,
        phone: null,
        signedName: 'Koffi Yao',
        signedAt: new Date('2026-06-08T10:00:00Z'),
        acceptedIp: '1.2.3.4',
        createdAt: new Date('2026-06-08'),
      })

      const pdf = await generateVendorContractPdf('tok')
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    })
  })
})
