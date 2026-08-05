import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: (...a: unknown[]) => mockGetUser(...a) } },
}))

const leadCreate = vi.fn()
const leadFindFirst = vi.fn()
const leadFindUnique = vi.fn()
const leadFindMany = vi.fn()
const leadUpdate = vi.fn()
const userUpsert = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    // Contexte staff chargé par requireCapability sur toute route back-office.
    teamMemberProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    logisticsQuoteRequest: {
      create: (...a: unknown[]) => leadCreate(...a),
      findFirst: (...a: unknown[]) => leadFindFirst(...a),
      findUnique: (...a: unknown[]) => leadFindUnique(...a),
      findMany: (...a: unknown[]) => leadFindMany(...a),
      update: (...a: unknown[]) => leadUpdate(...a),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    logisticsQuoteRequestEvent: { create: vi.fn().mockResolvedValue({}) },
    logisticsQuoteRequestPhoto: { create: vi.fn() },
    vehicle: { findFirst: vi.fn() },
    partRequest: { findFirst: vi.fn() },
    enterpriseMember: { findUnique: vi.fn() },
    user: {
      upsert: (...a: unknown[]) => userUpsert(...a),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn(async (k: string) => `https://images.pieces.ci/${k}`),
  downloadFromR2: vi.fn(),
  getPublicUrl: vi.fn(),
}))

vi.mock('../../lib/imageProcessor.js', () => ({
  processVariants: vi.fn(async () => ({
    thumb: Buffer.from('t'),
    small: Buffer.from('s'),
    medium: Buffer.from('m'),
    large: Buffer.from('l'),
  })),
  MAX_FILE_SIZE: 5 * 1024 * 1024,
}))

vi.mock('../whatsapp/baileys.sender.js', () => ({
  sendBaileysText: vi.fn(async () => true),
  isBaileysConnected: () => false,
}))

vi.mock('../queue/worker.js', () => ({
  startWorker: vi.fn(),
  ensureMaintenanceReminderScheduled: vi.fn(),
  ensureBufferReplenishScheduled: vi.fn(),
  ensureVendorRelanceScheduled: vi.fn(),
  ensureEnrichmentSourcingScheduled: vi.fn(),
}))

const { buildApp } = await import('../../server.js')
const { hashToken } = await import('./logistics.service.js')

const app = buildApp()

const VALID_BODY = {
  contactName: 'Koffi Yao',
  phone: '0707000000',
  partName: 'Amortisseur avant',
  consent: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  leadFindFirst.mockResolvedValue(null)
  leadCreate.mockImplementation(async ({ data }: { data: { reference: string } }) => ({
    id: 'lead-1',
    reference: data.reference,
  }))
})

describe('POST /api/v1/logistics/quote-requests', () => {
  it('crée une demande sans authentification', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/logistics/quote-requests',
      payload: VALID_BODY,
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data.reference).toMatch(/^LOG-\d{4}-[A-HJ-NP-Z2-9]{4}$/)
    expect(body.data.uploadToken).toHaveLength(64)
    expect(body.data.estimate.options.length).toBeGreaterThan(1)
  })

  it('refuse un corps invalide', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/logistics/quote-requests',
      payload: { contactName: 'K', phone: 'abc', partName: 'x' },
    })
    // Le gestionnaire d'erreurs global mappe les erreurs de validation Fastify sur 422.
    expect(res.statusCode).toBe(422)
  })

  it('exige le consentement explicite', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/logistics/quote-requests',
      payload: { ...VALID_BODY, consent: false },
    })
    expect(res.statusCode).toBe(422)
  })

  it('rattache la demande au compte quand un Bearer valide est fourni', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'sb-1', phone: '2250707000000' } }, error: null })
    userUpsert.mockResolvedValue({
      id: 'user-1',
      phone: '+2250707000000',
      email: null,
      roles: ['BUYER'],
      activeContext: 'BUYER',
      consentedAt: new Date(),
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/logistics/quote-requests',
      headers: { authorization: 'Bearer valid-token' },
      payload: VALID_BODY,
    })

    expect(res.statusCode).toBe(201)
    expect(leadCreate.mock.calls[0]![0].data.userId).toBe('user-1')
  })

  it('dégrade en mode public quand le jeton est expiré, sans renvoyer 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'expired' } })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/logistics/quote-requests',
      headers: { authorization: 'Bearer expired-token' },
      payload: VALID_BODY,
    })

    expect(res.statusCode).toBe(201)
    expect(leadCreate.mock.calls[0]![0].data.userId).toBeNull()
  })
})

describe('POST /api/v1/logistics/quote-requests/:id/photos', () => {
  const token = 'b'.repeat(64)

  function multipart(kind: string, mime = 'image/jpeg', filename = 'p.jpg') {
    const boundary = '----pieces-test-boundary'
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="kind"\r\n\r\n${kind}\r\n` +
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
          `Content-Type: ${mime}\r\n\r\n`,
      ),
      Buffer.from('fake-image-bytes'),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ])
    return { boundary, body }
  }

  it('refuse sans jeton d\'upload', async () => {
    leadFindUnique.mockResolvedValue({
      id: 'lead-1',
      status: 'NEW',
      userId: null,
      enterpriseId: null,
      uploadTokenHash: hashToken(token),
      uploadTokenExpiresAt: new Date(Date.now() + 60_000),
      _count: { photos: 0 },
    })

    const { boundary, body } = multipart('PART')
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/logistics/quote-requests/lead-1/photos',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    })

    expect(res.statusCode).toBe(401)
  })

  it('rejette un type de fichier interdit', async () => {
    leadFindUnique.mockResolvedValue({
      id: 'lead-1',
      status: 'NEW',
      userId: null,
      enterpriseId: null,
      uploadTokenHash: hashToken(token),
      uploadTokenExpiresAt: new Date(Date.now() + 60_000),
      _count: { photos: 0 },
    })

    const { boundary, body } = multipart('PART', 'application/pdf', 'p.pdf')
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/logistics/quote-requests/lead-1/photos',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'x-upload-token': token,
      },
      payload: body,
    })

    expect(res.statusCode).toBe(422)
    expect(res.json().error.code).toBe('INVALID_FILE_TYPE')
  })

  it('ne renvoie jamais l\'URL d\'une carte grise', async () => {
    leadFindUnique
      .mockResolvedValueOnce({
        id: 'lead-1',
        status: 'NEW',
        userId: null,
        enterpriseId: null,
        uploadTokenHash: hashToken(token),
        uploadTokenExpiresAt: new Date(Date.now() + 60_000),
        _count: { photos: 0 },
      })
      .mockResolvedValueOnce(null)

    const prismaModule = await import('../../lib/prisma.js')
    ;(prismaModule.prisma.logisticsQuoteRequestPhoto.create as ReturnType<typeof vi.fn>)
      .mockResolvedValue({ id: 'photo-1', kind: 'REGISTRATION_CARD', position: 0 })

    const { boundary, body } = multipart('REGISTRATION_CARD')
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/logistics/quote-requests/lead-1/photos',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'x-upload-token': token,
      },
      payload: body,
    })

    expect(res.statusCode).toBe(201)
    expect(JSON.stringify(res.json())).not.toContain('images.pieces.ci')
  })
})

describe('routes protégées', () => {
  it('refuse /quote-requests/mine sans jeton', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/logistics/quote-requests/mine' })
    expect(res.statusCode).toBe(401)
  })

  it('refuse le back-office à un non-admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'sb-2' } }, error: null })
    userUpsert.mockResolvedValue({
      id: 'user-2',
      phone: null,
      email: 'a@b.ci',
      roles: ['BUYER'],
      activeContext: 'BUYER',
      consentedAt: new Date(),
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/logistics/quote-requests',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect([401, 403]).toContain(res.statusCode)
  })

  it('refuse une cotation de flotte à un non-membre', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'sb-3' } }, error: null })
    userUpsert.mockResolvedValue({
      id: 'user-3',
      phone: null,
      email: 'c@d.ci',
      roles: ['ENTERPRISE'],
      activeContext: 'ENTERPRISE',
      consentedAt: new Date(),
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/enterprises/11111111-1111-4111-8111-111111111111/logistics/quote-requests',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(res.statusCode).toBe(403)
  })
})
