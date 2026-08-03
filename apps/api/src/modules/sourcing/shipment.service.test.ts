import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')

const ADMIN = 'f0f0f0f0-1111-4222-8333-444444444444'
const SHIP1 = '11111111-2222-4333-8444-555555555555'
const PO1 = '123e4567-e89b-42d3-a456-426614174000'

const mockShipmentFindUnique = vi.fn()
const mockShipmentCreate = vi.fn()
const mockShipmentUpdate = vi.fn()
const mockPoFindUnique = vi.fn()
const mockPoUpdate = vi.fn()
const mockNotifyWhatsApp = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    shipment: {
      findUnique: (...a: unknown[]) => mockShipmentFindUnique(...a),
      create: (...a: unknown[]) => mockShipmentCreate(...a),
      update: (...a: unknown[]) => mockShipmentUpdate(...a),
    },
    purchaseOrder: {
      findUnique: (...a: unknown[]) => mockPoFindUnique(...a),
      update: (...a: unknown[]) => mockPoUpdate(...a),
    },
  },
}))

vi.mock('../whatsapp/whatsapp.service.js', () => ({
  notifyWhatsAppUser: (...a: unknown[]) => mockNotifyWhatsApp(...a),
}))

const {
  createShipment,
  transitionShipment,
  updateShipment,
  notifyShipmentUpdate,
  buildShipmentReference,
} = await import('./shipment.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  mockShipmentFindUnique.mockResolvedValue(null)
})

describe('buildShipmentReference', () => {
  it('produit EXP-AAAAMMJJ-XXXX sans caractère ambigu', () => {
    const ref = buildShipmentReference(new Date('2026-08-03T10:00:00Z'))
    expect(ref).toMatch(/^EXP-20260803-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/)
    // Le suffixe aléatoire est dictable au téléphone : ni I, ni O, ni 0, ni 1.
    expect(ref.slice(-4)).not.toMatch(/[IO01]/)
  })
})

describe('createShipment', () => {
  beforeEach(() => {
    mockShipmentCreate.mockResolvedValue({ id: SHIP1, reference: 'EXP-20260803-AAAA' })
  })

  it('génère le lien de suivi DHL depuis le numéro', async () => {
    await createShipment(ADMIN, {
      quoteRequestId: 'clz9k3x7t0000abcd1234efgh',
      carrier: 'DHL',
      trackingNumber: '1234567890',
      mode: 'AIR_STANDARD',
    })

    const data = mockShipmentCreate.mock.calls[0]![0].data
    expect(data.trackingUrl).toContain('dhl.com')
    expect(data.trackingUrl).toContain('1234567890')
  })

  it('laisse le lien vide pour un transitaire (pas de page publique)', async () => {
    await createShipment(ADMIN, {
      quoteRequestId: 'clz9k3x7t0000abcd1234efgh',
      carrier: 'TRANSITAIRE',
      trackingNumber: 'DOS-42',
    })
    expect(mockShipmentCreate.mock.calls[0]![0].data.trackingUrl).toBeNull()
  })

  it('journalise l\'étape SOURCING à la création', async () => {
    await createShipment(ADMIN, {
      quoteRequestId: 'clz9k3x7t0000abcd1234efgh',
      carrier: 'DHL',
    })
    expect(mockShipmentCreate.mock.calls[0]![0].data.events.create).toMatchObject({
      toStatus: 'SOURCING',
      actorUserId: ADMIN,
    })
  })

  it('déduit la demande cliente depuis le bon de commande', async () => {
    mockPoFindUnique.mockResolvedValue({
      id: PO1,
      sourcingOffers: [{ search: { quoteRequestId: 'clz9k3x7t0000abcd1234efgh' } }],
    })

    await createShipment(ADMIN, { purchaseOrderId: PO1, carrier: 'DHL' })

    expect(mockShipmentCreate.mock.calls[0]![0].data.quoteRequestId).toBe(
      'clz9k3x7t0000abcd1234efgh',
    )
  })

  it('totalise les coûts saisis', async () => {
    await createShipment(ADMIN, {
      quoteRequestId: 'clz9k3x7t0000abcd1234efgh',
      carrier: 'DHL',
      freightCostFcfa: 45_000,
      customsCostFcfa: 12_000,
      lastMileCostFcfa: 2_000,
    })
    expect(mockShipmentCreate.mock.calls[0]![0].data.totalCostFcfa).toBe(59_000)
  })

  it('refuse une expédition sans rattachement', async () => {
    await expect(createShipment(ADMIN, { carrier: 'DHL' })).rejects.toMatchObject({
      statusCode: 422,
    })
  })
})

describe('transitionShipment', () => {
  function shipment(over: Record<string, unknown> = {}) {
    return { id: SHIP1, status: 'SOURCING', purchaseOrderId: null, ...over }
  }

  beforeEach(() => {
    mockShipmentUpdate.mockResolvedValue({ id: SHIP1 })
  })

  it('suit la machine à états du doc §4', async () => {
    mockShipmentFindUnique.mockResolvedValue(shipment({ status: 'SOURCING' }))
    await transitionShipment(SHIP1, ADMIN, { toStatus: 'COLLECTED' })
    expect(mockShipmentUpdate.mock.calls[0]![0].data.status).toBe('COLLECTED')
  })

  it('refuse un saut d\'étape', async () => {
    mockShipmentFindUnique.mockResolvedValue(shipment({ status: 'SOURCING' }))
    await expect(
      transitionShipment(SHIP1, ADMIN, { toStatus: 'DELIVERED' }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('refuse toute transition depuis un état terminal', async () => {
    mockShipmentFindUnique.mockResolvedValue(shipment({ status: 'DELIVERED' }))
    await expect(
      transitionShipment(SHIP1, ADMIN, { toStatus: 'IN_TRANSIT' }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('horodate departedAt au départ et deliveredAt à la livraison', async () => {
    mockShipmentFindUnique.mockResolvedValue(shipment({ status: 'COLLECTED' }))
    await transitionShipment(SHIP1, ADMIN, { toStatus: 'IN_TRANSIT' })
    expect(mockShipmentUpdate.mock.calls[0]![0].data.departedAt).toBeInstanceOf(Date)

    mockShipmentFindUnique.mockResolvedValue(shipment({ status: 'LOCAL_DELIVERY' }))
    await transitionShipment(SHIP1, ADMIN, { toStatus: 'DELIVERED' })
    expect(mockShipmentUpdate.mock.calls[1]![0].data.deliveredAt).toBeInstanceOf(Date)
  })

  it('n\'horodate pas COLLECTED — le colis n\'a rien quitté', async () => {
    mockShipmentFindUnique.mockResolvedValue(shipment({ status: 'SOURCING' }))
    await transitionShipment(SHIP1, ADMIN, { toStatus: 'COLLECTED' })
    const data = mockShipmentUpdate.mock.calls[0]![0].data
    expect(data.departedAt).toBeUndefined()
    expect(data.arrivedAt).toBeUndefined()
  })

  it('propage IN_TRANSIT au bon de commande quand il est ENVOYEE', async () => {
    mockShipmentFindUnique.mockResolvedValue(shipment({ status: 'COLLECTED', purchaseOrderId: PO1 }))
    mockPoFindUnique.mockResolvedValue({ id: PO1, statut: 'ENVOYEE', numero: 'BC-20260803-AAAA' })

    await transitionShipment(SHIP1, ADMIN, { toStatus: 'IN_TRANSIT' })

    expect(mockPoUpdate).toHaveBeenCalledWith({
      where: { id: PO1 },
      data: { statut: 'EN_TRANSIT' },
    })
  })

  it('ne force PAS un bon de commande encore en BROUILLON, et le dit dans l\'événement', async () => {
    mockShipmentFindUnique.mockResolvedValue(shipment({ status: 'COLLECTED', purchaseOrderId: PO1 }))
    mockPoFindUnique.mockResolvedValue({ id: PO1, statut: 'BROUILLON', numero: 'BC-20260803-AAAA' })

    await transitionShipment(SHIP1, ADMIN, { toStatus: 'IN_TRANSIT' })

    expect(mockPoUpdate).not.toHaveBeenCalled()
    expect(mockShipmentUpdate.mock.calls[0]![0].data.events.create.note).toMatch(
      /BC-20260803-AAAA.*BROUILLON/,
    )
  })

  it('ne touche pas au bon de commande à la livraison — la réception reste un geste stock', async () => {
    mockShipmentFindUnique.mockResolvedValue(
      shipment({ status: 'LOCAL_DELIVERY', purchaseOrderId: PO1 }),
    )
    await transitionShipment(SHIP1, ADMIN, { toStatus: 'DELIVERED' })
    expect(mockPoUpdate).not.toHaveBeenCalled()
  })

  it('permet l\'annulation depuis un état non terminal', async () => {
    mockShipmentFindUnique.mockResolvedValue(shipment({ status: 'IN_TRANSIT' }))
    await transitionShipment(SHIP1, ADMIN, { toStatus: 'CANCELLED' })
    expect(mockShipmentUpdate.mock.calls[0]![0].data.status).toBe('CANCELLED')
  })
})

describe('updateShipment', () => {
  it('régénère le lien de suivi quand le numéro change', async () => {
    mockShipmentFindUnique.mockResolvedValue({
      id: SHIP1,
      carrier: 'FEDEX',
      trackingNumber: null,
      freightCostFcfa: null,
      customsCostFcfa: null,
      lastMileCostFcfa: null,
    })
    mockShipmentUpdate.mockResolvedValue({})

    await updateShipment(SHIP1, { trackingNumber: '987654321' })

    expect(mockShipmentUpdate.mock.calls[0]![0].data.trackingUrl).toContain('fedex.com')
  })

  it('retotalise les coûts en tenant compte des valeurs déjà en base', async () => {
    mockShipmentFindUnique.mockResolvedValue({
      id: SHIP1,
      carrier: 'DHL',
      trackingNumber: null,
      freightCostFcfa: 45_000,
      customsCostFcfa: 12_000,
      lastMileCostFcfa: null,
    })
    mockShipmentUpdate.mockResolvedValue({})

    await updateShipment(SHIP1, { lastMileCostFcfa: 2_000 })

    expect(mockShipmentUpdate.mock.calls[0]![0].data.totalCostFcfa).toBe(59_000)
  })
})

describe('notifyShipmentUpdate', () => {
  it('ne nomme JAMAIS le transitaire au client', async () => {
    mockShipmentFindUnique.mockResolvedValue({
      reference: 'EXP-20260803-AAAA',
      status: 'IN_TRANSIT',
      carrier: 'TRANSITAIRE',
      etaAt: null,
      quoteRequest: {
        reference: 'LOG-0308-AB2C',
        partName: 'Plaquettes avant',
        phone: '+2250700000000',
        whatsapp: null,
      },
    })
    mockNotifyWhatsApp.mockResolvedValue({ sent: true, channel: 'baileys' })

    await notifyShipmentUpdate(SHIP1)

    const text = mockNotifyWhatsApp.mock.calls[0]![1] as string
    expect(text).toContain('notre partenaire logistique')
    expect(text).not.toMatch(/transitaire/i)
    expect(text).toContain('LOG-0308-AB2C')
  })

  it('nomme DHL, dont le suivi est public', async () => {
    mockShipmentFindUnique.mockResolvedValue({
      reference: 'EXP-20260803-AAAA',
      status: 'CUSTOMS',
      carrier: 'DHL',
      etaAt: null,
      quoteRequest: {
        reference: 'LOG-0308-AB2C',
        partName: 'Plaquettes avant',
        phone: '+2250700000000',
        whatsapp: '+2250700000001',
      },
    })
    mockNotifyWhatsApp.mockResolvedValue({ sent: true, channel: 'cloud' })

    await notifyShipmentUpdate(SHIP1)

    expect(mockNotifyWhatsApp.mock.calls[0]![0]).toBe('+2250700000001') // WhatsApp prioritaire
    expect(mockNotifyWhatsApp.mock.calls[0]![1]).toContain('DHL')
  })

  it('refuse d\'envoyer sans contact rattaché', async () => {
    mockShipmentFindUnique.mockResolvedValue({
      reference: 'EXP-20260803-AAAA',
      status: 'IN_TRANSIT',
      carrier: 'DHL',
      etaAt: null,
      quoteRequest: null,
    })
    await expect(notifyShipmentUpdate(SHIP1)).rejects.toMatchObject({ statusCode: 422 })
  })
})
