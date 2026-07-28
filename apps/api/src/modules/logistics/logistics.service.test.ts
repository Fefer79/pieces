import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const leadCreate = vi.fn()
const leadFindFirst = vi.fn()
const leadFindUnique = vi.fn()
const leadUpdate = vi.fn()
const eventCreate = vi.fn()
const photoCreate = vi.fn()
const vehicleFindFirst = vi.fn()
const enterpriseMemberFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    logisticsQuoteRequest: {
      create: (...a: unknown[]) => leadCreate(...a),
      findFirst: (...a: unknown[]) => leadFindFirst(...a),
      findUnique: (...a: unknown[]) => leadFindUnique(...a),
      update: (...a: unknown[]) => leadUpdate(...a),
    },
    logisticsQuoteRequestEvent: { create: (...a: unknown[]) => eventCreate(...a) },
    logisticsQuoteRequestPhoto: { create: (...a: unknown[]) => photoCreate(...a) },
    vehicle: { findFirst: (...a: unknown[]) => vehicleFindFirst(...a) },
    enterpriseMember: { findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a) },
    partRequest: { findFirst: vi.fn() },
  },
}))

const uploadToR2 = vi.fn(async (key: string) => `https://images.pieces.ci/${key}`)
vi.mock('../../lib/r2.js', () => ({ uploadToR2: (...a: unknown[]) => uploadToR2(...(a as [string])) }))

vi.mock('../../lib/imageProcessor.js', () => ({
  processVariants: vi.fn(async () => ({
    thumb: Buffer.from('t'),
    small: Buffer.from('s'),
    medium: Buffer.from('m'),
    large: Buffer.from('l'),
  })),
  MAX_FILE_SIZE: 5 * 1024 * 1024,
}))

const sendBaileysText = vi.fn(async () => true)
vi.mock('../whatsapp/baileys.sender.js', () => ({
  sendBaileysText: (...a: unknown[]) => sendBaileysText(...(a as [])),
  isBaileysConnected: () => false,
}))

const {
  createQuoteRequest,
  addQuoteRequestPhoto,
  buildReference,
  buildEstimate,
  hashToken,
  certaintySignalsFor,
} = await import('./logistics.service.js')

const BASE = {
  contactName: 'Koffi Yao',
  phone: '0707000000',
  partName: 'Amortisseur avant',
  consent: true as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  leadFindFirst.mockResolvedValue(null)
  leadCreate.mockImplementation(async ({ data }: { data: { reference: string } }) => ({
    id: 'lead-1',
    reference: data.reference,
  }))
  eventCreate.mockResolvedValue({})
})

describe('buildReference', () => {
  it('produit une référence courte, dictable, sans caractère ambigu', () => {
    const ref = buildReference(new Date(Date.UTC(2026, 6, 28)))
    expect(ref).toMatch(/^LOG-2807-[A-HJ-NP-Z2-9]{4}$/)
    // Le suffixe aléatoire ne doit contenir aucun caractère confondable à l'oral
    // ou à l'écrit (I/1, O/0). Le préfixe « LOG » est fixe et sans ambiguïté.
    expect(ref.slice(9)).not.toMatch(/[IO01]/)
  })
})

describe('createQuoteRequest — normalisation et persistance', () => {
  it('normalise le téléphone au format +225XXXXXXXXXX', async () => {
    await createQuoteRequest(BASE)
    expect(leadCreate).toHaveBeenCalledTimes(1)
    expect(leadCreate.mock.calls[0]![0].data.phone).toBe('+2250707000000')
  })

  it('rejette un numéro non ivoirien', async () => {
    // Le regex du validateur laisse passer 10 chiffres ; c'est la normalisation
    // serveur qui tranche.
    await expect(createQuoteRequest({ ...BASE, phone: '+33612345678' })).rejects.toThrow(
      /INVALID_PHONE|invalide/i,
    )
  })

  it('exige le consentement', async () => {
    await expect(createQuoteRequest({ ...BASE, consent: false })).rejects.toThrow()
  })

  it('met le VIN en majuscules et calcule la catégorie du véhicule', async () => {
    await createQuoteRequest({ ...BASE, vin: 'lfph4acx7r1000001', energyType: 'EV' })
    const data = leadCreate.mock.calls[0]![0].data
    expect(data.vin).toBe('LFPH4ACX7R1000001')
    expect(data.economyCategory).toBe('PREMIUM_EV')
    expect(data.downtimeCostPerDay).toBe(38_000)
  })

  it('journalise la création', async () => {
    await createQuoteRequest(BASE)
    expect(eventCreate).toHaveBeenCalledTimes(1)
    expect(eventCreate.mock.calls[0]![0].data.toStatus).toBe('NEW')
  })
})

describe('createQuoteRequest — anti-abus', () => {
  it('avale le honeypot : référence renvoyée, rien persisté', async () => {
    const res = await createQuoteRequest({ ...BASE, website: 'http://spam.example' })
    expect(res.reference).toMatch(/^LOG-/)
    expect(leadCreate).not.toHaveBeenCalled()
  })

  it('marque SPAM une soumission trop rapide, sans la perdre', async () => {
    await createQuoteRequest({ ...BASE, startedAt: Date.now() - 500 })
    expect(leadCreate.mock.calls[0]![0].data.status).toBe('SPAM')
  })

  it('laisse passer un remplissage humain', async () => {
    await createQuoteRequest({ ...BASE, startedAt: Date.now() - 30_000 })
    expect(leadCreate.mock.calls[0]![0].data.status).toBe('NEW')
  })

  it('ne conserve jamais l\'IP en clair', async () => {
    await createQuoteRequest(BASE, { ip: '41.66.1.2' })
    const data = leadCreate.mock.calls[0]![0].data
    expect(data.ipHash).toBeTruthy()
    expect(data.ipHash).not.toContain('41.66')
  })

  it('dédoublonne un même téléphone + même pièce dans la fenêtre de 10 min', async () => {
    leadFindFirst.mockResolvedValue({
      id: 'lead-existant',
      reference: 'LOG-2807-ABCD',
      certaintyScore: 40,
      certaintyLevel: 'MEDIUM',
      downtimeCostPerDay: 30_000,
      estimateJson: null,
    })
    leadUpdate.mockResolvedValue({})

    const res = await createQuoteRequest(BASE)
    expect(res.id).toBe('lead-existant')
    expect(leadCreate).not.toHaveBeenCalled()
    // Un nouveau jeton d'upload est émis pour permettre de compléter les photos.
    expect(leadUpdate).toHaveBeenCalled()
  })
})

describe('createQuoteRequest — estimation recalculée serveur', () => {
  it('ignore toute estimation envoyée par le client', async () => {
    await createQuoteRequest({ ...BASE, estimate: { totalCost: 1 } } as never)
    const stored = leadCreate.mock.calls[0]![0].data.estimateJson
    expect(stored.options.length).toBeGreaterThan(1)
    expect(stored.options.every((o: { totalCost: number }) => o.totalCost > 1)).toBe(true)
  })

  it('n\'expose jamais le stock pré-positionné à un prospect', async () => {
    await createQuoteRequest(BASE)
    const stored = leadCreate.mock.calls[0]![0].data.estimateJson
    expect(stored.options.map((o: { mode: string }) => o.mode)).not.toContain('PRE_POSITIONED')
  })

  it('sans prix pièce, part à 0 sur toutes les options (le total est un plancher)', async () => {
    await createQuoteRequest(BASE)
    const stored = leadCreate.mock.calls[0]![0].data.estimateJson
    expect(stored.options.every((o: { partPrice: number }) => o.partPrice === 0)).toBe(true)
  })

  it('utilise le prix pièce quand il est fourni', async () => {
    await createQuoteRequest({ ...BASE, partPriceHint: 32_000 })
    const stored = leadCreate.mock.calls[0]![0].data.estimateJson
    expect(stored.options.every((o: { partPrice: number }) => o.partPrice === 32_000)).toBe(true)
  })

  it('retient la catégorie premium thermique par défaut (30 000 F/jour)', () => {
    const estimate = buildEstimate({
      partName: 'plaquettes de frein',
      economyCategory: 'PREMIUM_ICE',
    })
    expect(estimate.downtimeCostPerDay).toBe(30_000)
    expect(estimate.familyId).toBe('BRAKE_PADS')
  })
})

describe('createQuoteRequest — rattachement flotte', () => {
  it('refuse un véhicule qui n\'appartient pas à la flotte du porteur du jeton', async () => {
    enterpriseMemberFindUnique.mockResolvedValue({ role: 'MANAGER' })
    vehicleFindFirst.mockResolvedValue(null)

    await expect(
      createQuoteRequest(
        {
          ...BASE,
          enterpriseId: '11111111-1111-4111-8111-111111111111',
          vehicleId: '22222222-2222-4222-8222-222222222222',
        },
        { userId: 'user-1' },
      ),
    ).rejects.toThrow(/LOGISTICS_VEHICLE_NOT_FOUND|introuvable/i)
    expect(leadCreate).not.toHaveBeenCalled()
  })

  it('reprend marque, modèle et VIN du véhicule de la flotte plutôt que la saisie client', async () => {
    enterpriseMemberFindUnique.mockResolvedValue({ role: 'MANAGER' })
    vehicleFindFirst.mockResolvedValue({
      brand: 'Bestune',
      model: 'NAT',
      year: 2025,
      vin: 'LFPH4ACX7R1000009',
      energyType: 'EV',
    })

    await createQuoteRequest(
      {
        ...BASE,
        vehicleBrand: 'Peugeot',
        vin: 'ZZZZZZZZZZZZZZZZZ',
        enterpriseId: '11111111-1111-4111-8111-111111111111',
        vehicleId: '22222222-2222-4222-8222-222222222222',
      },
      { userId: 'user-1' },
    )

    const data = leadCreate.mock.calls[0]![0].data
    expect(data.vehicleBrand).toBe('Bestune')
    expect(data.vin).toBe('LFPH4ACX7R1000009')
    expect(data.economyCategory).toBe('PREMIUM_EV')
    expect(data.userId).toBe('user-1')
  })

  it('dispense un compte authentifié du honeypot', async () => {
    const res = await createQuoteRequest(
      { ...BASE, website: 'rempli', startedAt: Date.now() },
      { userId: 'user-1' },
    )
    expect(leadCreate).toHaveBeenCalled()
    expect(res.reference).toMatch(/^LOG-/)
  })
})

describe('certaintySignalsFor', () => {
  it('compte la photo de pièce et la carte grise séparément', () => {
    const signals = certaintySignalsFor(
      { partName: 'Amortisseur', vin: 'LFPH4ACX7R1000001' },
      { hasPart: true, hasRegistration: false },
    )
    expect(signals.partPhoto).toBe(true)
    expect(signals.registrationPhoto).toBe(false)
    expect(signals.vin).toBe(true)
  })
})

describe('addQuoteRequestPhoto', () => {
  const token = 'a'.repeat(64)

  function leadRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'lead-1',
      status: 'NEW',
      userId: null,
      enterpriseId: null,
      uploadTokenHash: hashToken(token),
      uploadTokenExpiresAt: new Date(Date.now() + 60_000),
      _count: { photos: 0 },
      ...overrides,
    }
  }

  it('refuse sans jeton ni session', async () => {
    leadFindUnique.mockResolvedValue(leadRow())
    await expect(
      addQuoteRequestPhoto('lead-1', null, null, {
        buffer: Buffer.from('x'),
        mimeType: 'image/jpeg',
        filename: 'p.jpg',
        kind: 'PART',
      }),
    ).rejects.toThrow(/LOGISTICS_UPLOAD_TOKEN_INVALID|invalide/i)
  })

  it('refuse un jeton expiré', async () => {
    leadFindUnique.mockResolvedValue(
      leadRow({ uploadTokenExpiresAt: new Date(Date.now() - 1000) }),
    )
    await expect(
      addQuoteRequestPhoto('lead-1', token, null, {
        buffer: Buffer.from('x'),
        mimeType: 'image/jpeg',
        filename: 'p.jpg',
        kind: 'PART',
      }),
    ).rejects.toThrow(/EXPIRED|expiré/i)
  })

  it('refuse un format non image', async () => {
    leadFindUnique.mockResolvedValue(leadRow())
    await expect(
      addQuoteRequestPhoto('lead-1', token, null, {
        buffer: Buffer.from('x'),
        mimeType: 'application/pdf',
        filename: 'p.pdf',
        kind: 'REGISTRATION_CARD',
      }),
    ).rejects.toThrow(/INVALID_FILE_TYPE|JPEG/i)
  })

  it('refuse la 5ᵉ photo', async () => {
    leadFindUnique.mockResolvedValue(leadRow({ _count: { photos: 4 } }))
    await expect(
      addQuoteRequestPhoto('lead-1', token, null, {
        buffer: Buffer.from('x'),
        mimeType: 'image/jpeg',
        filename: 'p.jpg',
        kind: 'PART',
      }),
    ).rejects.toThrow(/MAX_PHOTOS|Maximum/i)
  })

  it('refuse une demande déjà prise en charge', async () => {
    leadFindUnique.mockResolvedValue(leadRow({ status: 'CONTACTED' }))
    await expect(
      addQuoteRequestPhoto('lead-1', token, null, {
        buffer: Buffer.from('x'),
        mimeType: 'image/jpeg',
        filename: 'p.jpg',
        kind: 'PART',
      }),
    ).rejects.toThrow(/LOCKED|traitement/i)
  })

  it('accepte le propriétaire authentifié sans jeton d\'upload', async () => {
    leadFindUnique
      .mockResolvedValueOnce(leadRow({ userId: 'user-1', uploadTokenHash: null }))
      .mockResolvedValueOnce(null) // recomputeCertainty
    photoCreate.mockResolvedValue({ id: 'photo-1', kind: 'PART', position: 0 })

    const photo = await addQuoteRequestPhoto('lead-1', null, 'user-1', {
      buffer: Buffer.from('x'),
      mimeType: 'image/jpeg',
      filename: 'p.jpg',
      kind: 'PART',
    })
    expect(photo.id).toBe('photo-1')
  })

  it('stocke sous une clé non devinable et ne renvoie jamais l\'URL', async () => {
    leadFindUnique.mockResolvedValueOnce(leadRow()).mockResolvedValueOnce(null)
    photoCreate.mockResolvedValue({ id: 'photo-1', kind: 'REGISTRATION_CARD', position: 0 })

    const photo = await addQuoteRequestPhoto('lead-1', token, null, {
      buffer: Buffer.from('x'),
      mimeType: 'image/jpeg',
      filename: 'carte grise.jpg',
      kind: 'REGISTRATION_CARD',
    })

    expect(photo).not.toHaveProperty('url')
    expect(photo).not.toHaveProperty('thumbUrl')

    const key = uploadToR2.mock.calls[0]![0]
    expect(key).toMatch(/^logistics-leads\/lead-1\/[0-9a-f-]{36}_registration_card\.jpg$/)
  })
})
