import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

const mockShipmentCreate = vi.fn()
const mockShipmentFindUnique = vi.fn()
const mockShipmentUpdate = vi.fn()
const mockPoFindUnique = vi.fn()
const mockPoUpdateMany = vi.fn()
const mockLeadFindUnique = vi.fn()
const mockNotify = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    shipment: {
      create: (...a: unknown[]) => mockShipmentCreate(...a),
      findUnique: (...a: unknown[]) => mockShipmentFindUnique(...a),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      update: (...a: unknown[]) => mockShipmentUpdate(...a),
    },
    purchaseOrder: {
      findUnique: (...a: unknown[]) => mockPoFindUnique(...a),
      updateMany: (...a: unknown[]) => mockPoUpdateMany(...a),
    },
    logisticsQuoteRequest: { findUnique: (...a: unknown[]) => mockLeadFindUnique(...a) },
  },
}))

vi.mock('../whatsapp/whatsapp.service.js', () => ({
  notifyWhatsAppUser: (...a: unknown[]) => mockNotify(...a),
}))

const {
  createShipment,
  transitionShipment,
  updateShipment,
  getShipmentPublic,
  notifyShipmentUpdate,
  buildShipmentReference,
  hashToken,
} = await import('./shipment.service.js')

describe('buildShipmentReference', () => {
  it('produit EXP-YYYYMMDD-XXXX sans caractère ambigu', () => {
    const ref = buildShipmentReference(new Date(Date.UTC(2026, 7, 3)))
    expect(ref).toMatch(/^EXP-20260803-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/)
  })
})

describe('createShipment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPoFindUnique.mockResolvedValue({ id: 'po1' })
    mockShipmentCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'sh1', ...data, events: [] }),
    )
  })

  it('construit le lien de suivi DHL depuis le numéro', async () => {
    const shipment = await createShipment(
      { purchaseOrderId: '11111111-1111-1111-1111-111111111111', carrier: 'DHL', trackingNumber: '1234567890', mode: 'AIR_STANDARD' },
      'admin-1',
    )
    expect(shipment.trackingUrl).toContain('dhl.com')
    expect(shipment.trackingUrl).toContain('1234567890')
  })

  it('ne construit aucun lien pour un transitaire', async () => {
    const shipment = await createShipment(
      { carrier: 'TRANSITAIRE', trackingNumber: 'AWB-42', mode: 'AIR_STANDARD' },
      'admin-1',
    )
    expect(shipment.trackingUrl).toBeNull()
  })

  it('calcule le poids taxable aérien depuis le volume', async () => {
    const shipment = await createShipment(
      { carrier: 'DHL', mode: 'AIR_STANDARD', weightKg: 5, volumeDm3: 120 },
      'admin-1',
    )
    // aérien : max(5 kg, 120 / 6 = 20 kg)
    expect(shipment.chargeableWeightKg).toBe(20)
  })

  it('somme les coûts saisis', async () => {
    const shipment = await createShipment(
      {
        carrier: 'DHL',
        mode: 'AIR_STANDARD',
        freightCostFcfa: 50_000,
        customsCostFcfa: 20_000,
        lastMileCostFcfa: 2_000,
      },
      'admin-1',
    )
    expect(shipment.totalCostFcfa).toBe(72_000)
  })

  it('ne stocke que le hachage du jeton public', async () => {
    const shipment = await createShipment({ carrier: 'DHL', mode: 'AIR_STANDARD' }, 'admin-1')
    expect(shipment.publicToken).toMatch(/^[0-9a-f]{64}$/)
    expect(shipment.publicTokenHash).toBe(hashToken(shipment.publicToken))
    expect(shipment.publicTokenHash).not.toBe(shipment.publicToken)
  })

  it('journalise la création comme premier événement', async () => {
    await createShipment({ carrier: 'DHL', mode: 'AIR_STANDARD' }, 'admin-1')
    const data = mockShipmentCreate.mock.calls[0]?.[0].data as {
      events: { create: { toStatus: string } }
    }
    expect(data.events.create.toStatus).toBe('SOURCING')
  })
})

describe('transitionShipment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockShipmentUpdate.mockImplementation(({ data }: { data: unknown }) => Promise.resolve(data))
    mockPoUpdateMany.mockResolvedValue({ count: 1 })
  })

  it('avance et horodate le champ correspondant', async () => {
    mockShipmentFindUnique.mockResolvedValue({ id: 'sh1', status: 'IN_TRANSIT', purchaseOrderId: null })
    const data = (await transitionShipment(
      'sh1',
      { status: 'CUSTOMS', occurredAt: '2026-08-03T10:00:00.000Z' },
      'admin-1',
    )) as Record<string, unknown>
    expect(data.status).toBe('CUSTOMS')
    expect((data.arrivedAt as Date).toISOString()).toBe('2026-08-03T10:00:00.000Z')
  })

  it('refuse un retour en arrière', async () => {
    mockShipmentFindUnique.mockResolvedValue({ id: 'sh1', status: 'DELIVERED', purchaseOrderId: null })
    await expect(
      transitionShipment('sh1', { status: 'IN_TRANSIT' }, 'admin-1'),
    ).rejects.toMatchObject({ code: 'SHIPMENT_INVALID_TRANSITION' })
  })

  it('refuse une transition vers l\'étape courante', async () => {
    mockShipmentFindUnique.mockResolvedValue({ id: 'sh1', status: 'CUSTOMS', purchaseOrderId: null })
    await expect(transitionShipment('sh1', { status: 'CUSTOMS' }, 'admin-1')).rejects.toMatchObject({
      code: 'SHIPMENT_SAME_STATUS',
    })
  })

  it('passe le bon de commande EN_TRANSIT quand la pièce part', async () => {
    mockShipmentFindUnique.mockResolvedValue({ id: 'sh1', status: 'COLLECTED', purchaseOrderId: 'po1' })
    await transitionShipment('sh1', { status: 'IN_TRANSIT' }, 'admin-1')
    expect(mockPoUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: 'EN_TRANSIT' }),
      }),
    )
  })

  it('laisse la réception à l\'écran stock : la livraison ne touche pas au BC', async () => {
    mockShipmentFindUnique.mockResolvedValue({
      id: 'sh1',
      status: 'LOCAL_DELIVERY',
      purchaseOrderId: 'po1',
    })
    await transitionShipment('sh1', { status: 'DELIVERED' }, 'admin-1')
    expect(mockPoUpdateMany).not.toHaveBeenCalled()
  })

  it('écrit un événement à chaque étape', async () => {
    mockShipmentFindUnique.mockResolvedValue({ id: 'sh1', status: 'SOURCING', purchaseOrderId: null })
    const data = (await transitionShipment(
      'sh1',
      { status: 'COLLECTED', location: 'Sharjah', note: 'Retirée chez le vendeur' },
      'admin-1',
    )) as { events: { create: Record<string, unknown> } }
    expect(data.events.create).toMatchObject({
      fromStatus: 'SOURCING',
      toStatus: 'COLLECTED',
      location: 'Sharjah',
      note: 'Retirée chez le vendeur',
      actorUserId: 'admin-1',
    })
  })
})

describe('updateShipment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockShipmentUpdate.mockImplementation(({ data }: { data: unknown }) => Promise.resolve(data))
  })

  it('reconstruit le lien de suivi quand le numéro change', async () => {
    mockShipmentFindUnique.mockResolvedValue({
      id: 'sh1',
      carrier: 'DHL',
      trackingNumber: null,
      mode: 'AIR_STANDARD',
      weightKg: null,
      volumeDm3: null,
      freightCostFcfa: null,
      customsCostFcfa: null,
      lastMileCostFcfa: null,
    })
    const data = (await updateShipment('sh1', { trackingNumber: 'ABC123' })) as Record<
      string,
      unknown
    >
    expect(data.trackingUrl).toContain('ABC123')
  })

  it('recalcule le total quand un poste de coût change', async () => {
    mockShipmentFindUnique.mockResolvedValue({
      id: 'sh1',
      carrier: 'DHL',
      trackingNumber: null,
      mode: 'AIR_STANDARD',
      weightKg: null,
      volumeDm3: null,
      freightCostFcfa: 40_000,
      customsCostFcfa: 10_000,
      lastMileCostFcfa: null,
    })
    const data = (await updateShipment('sh1', { lastMileCostFcfa: 2_000 })) as Record<
      string,
      unknown
    >
    expect(data.totalCostFcfa).toBe(52_000)
  })
})

describe('getShipmentPublic', () => {
  beforeEach(() => vi.clearAllMocks())

  const stored = (over: Record<string, unknown> = {}) => ({
    reference: 'EXP-20260803-AAAA',
    status: 'IN_TRANSIT',
    carrier: 'TRANSITAIRE',
    trackingNumber: 'AWB-42',
    trackingUrl: null,
    etaAt: null,
    departedAt: null,
    deliveredAt: null,
    publicTokenHash: hashToken('a'.repeat(64)),
    events: [],
    ...over,
  })

  it('ne nomme jamais le transitaire au client', async () => {
    mockShipmentFindUnique.mockResolvedValue(stored())
    const view = await getShipmentPublic('EXP-20260803-AAAA', 'a'.repeat(64))
    expect(view.carrierLabel).toBe('Notre partenaire logistique')
    // Le numéro d'AWB interne n'est pas exposé sans lien de suivi public.
    expect(view.trackingNumber).toBeNull()
  })

  it('nomme DHL et expose son lien de suivi', async () => {
    mockShipmentFindUnique.mockResolvedValue(
      stored({ carrier: 'DHL', trackingUrl: 'https://www.dhl.com/track?x=1', trackingNumber: '123' }),
    )
    const view = await getShipmentPublic('EXP-20260803-AAAA', 'a'.repeat(64))
    expect(view.carrierLabel).toBe('DHL Express')
    expect(view.trackingNumber).toBe('123')
  })

  it('répond « introuvable » sur mauvais jeton — aucune énumération', async () => {
    mockShipmentFindUnique.mockResolvedValue(stored())
    await expect(getShipmentPublic('EXP-20260803-AAAA', 'b'.repeat(64))).rejects.toMatchObject({
      code: 'SHIPMENT_NOT_FOUND',
      statusCode: 404,
    })
  })
})

describe('notifyShipmentUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotify.mockResolvedValue({ sent: true, channel: 'cloud' })
  })

  it('privilégie le numéro WhatsApp du demandeur', async () => {
    mockShipmentFindUnique.mockResolvedValue({
      reference: 'EXP-1',
      status: 'CUSTOMS',
      etaAt: null,
      quoteRequest: { reference: 'LOG-1', phone: '+2250700000000', whatsapp: '+2250711111111' },
    })
    await notifyShipmentUpdate('sh1')
    expect(mockNotify).toHaveBeenCalledWith('+2250711111111', expect.stringContaining('Dédouanement'))
  })

  it('échoue proprement sans destinataire', async () => {
    mockShipmentFindUnique.mockResolvedValue({
      reference: 'EXP-1',
      status: 'CUSTOMS',
      etaAt: null,
      quoteRequest: null,
    })
    await expect(notifyShipmentUpdate('sh1')).rejects.toMatchObject({
      code: 'SHIPMENT_NO_RECIPIENT',
    })
  })
})
