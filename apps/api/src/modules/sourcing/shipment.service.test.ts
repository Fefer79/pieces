import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')

const shipmentCreate = vi.fn()
const shipmentFindUnique = vi.fn()
const shipmentFindFirst = vi.fn()
const shipmentUpdate = vi.fn()
const poUpdateMany = vi.fn()
const poFindUnique = vi.fn()
const leadFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    shipment: {
      create: (...a: unknown[]) => shipmentCreate(...a),
      findUnique: (...a: unknown[]) => shipmentFindUnique(...a),
      findFirst: (...a: unknown[]) => shipmentFindFirst(...a),
      update: (...a: unknown[]) => shipmentUpdate(...a),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    purchaseOrder: {
      findUnique: (...a: unknown[]) => poFindUnique(...a),
      updateMany: (...a: unknown[]) => poUpdateMany(...a),
    },
    logisticsQuoteRequest: { findUnique: (...a: unknown[]) => leadFindUnique(...a) },
  },
}))

const mockNotifyWhatsAppUser = vi.fn()
vi.mock('../whatsapp/whatsapp.service.js', () => ({
  notifyWhatsAppUser: (...a: unknown[]) => mockNotifyWhatsAppUser(...a),
}))

const {
  createShipment,
  updateShipment,
  transitionShipment,
  getShipmentPublic,
  getShipmentForQuoteRequest,
  notifyShipmentUpdate,
  buildShipmentReference,
  hashToken,
  toPublicShipment,
} = await import('./shipment.service.js')

const ADMIN = '11111111-2222-4333-8444-555555555555'

beforeEach(() => {
  vi.clearAllMocks()
  shipmentFindUnique.mockResolvedValue(null)
  shipmentCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: 'exp-1',
    ...data,
  }))
})

describe('buildShipmentReference', () => {
  it('produit une référence datée sans caractère ambigu', () => {
    const reference = buildShipmentReference(new Date('2026-08-03T10:00:00Z'))
    expect(reference).toMatch(/^EXP-20260803-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/)
  })
})

describe('createShipment', () => {
  it('génère le lien de suivi DHL et un jeton public renvoyé une seule fois', async () => {
    const shipment = await createShipment(
      { carrier: 'DHL', trackingNumber: '1234567890', mode: 'AIR_STANDARD' },
      ADMIN,
    )

    expect(shipment.trackingUrl).toContain('dhl.com')
    expect(shipment.trackingUrl).toContain('1234567890')
    expect(shipment.publicToken).toHaveLength(48)
    // Seul le hash part en base.
    const data = shipmentCreate.mock.calls[0]?.[0] as { data: { publicTokenHash: string } }
    expect(data.data.publicTokenHash).toBe(hashToken(shipment.publicToken))
  })

  it('ne fabrique pas de lien pour un transitaire (pas de page publique)', async () => {
    const shipment = await createShipment({ carrier: 'TRANSITAIRE', trackingNumber: 'LTA-99' }, ADMIN)
    expect(shipment.trackingUrl).toBeNull()
  })

  it('404 si le bon de commande n\'existe pas', async () => {
    poFindUnique.mockResolvedValue(null)
    await expect(createShipment({ purchaseOrderId: 'absent' }, ADMIN)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('transitionShipment', () => {
  const shipment = {
    id: 'exp-1',
    status: 'COLLECTED',
    purchaseOrderId: 'po-1',
    departedAt: null,
  }

  it('horodate le champ correspondant et écrit un événement', async () => {
    shipmentFindUnique.mockResolvedValue(shipment)
    shipmentUpdate.mockResolvedValue({ ...shipment, status: 'IN_TRANSIT', purchaseOrderId: 'po-1' })

    await transitionShipment('exp-1', { toStatus: 'IN_TRANSIT', location: 'Dubaï' }, ADMIN)

    const args = shipmentUpdate.mock.calls[0]?.[0] as {
      data: {
        status: string
        departedAt: Date
        events: { create: { fromStatus: string; toStatus: string; location: string } }
      }
    }
    expect(args.data.status).toBe('IN_TRANSIT')
    expect(args.data.departedAt).toBeInstanceOf(Date)
    expect(args.data.events.create).toMatchObject({
      fromStatus: 'COLLECTED',
      toStatus: 'IN_TRANSIT',
      location: 'Dubaï',
    })
  })

  it('propage EN_TRANSIT au bon de commande, seulement depuis ENVOYEE', async () => {
    shipmentFindUnique.mockResolvedValue(shipment)
    shipmentUpdate.mockResolvedValue({ ...shipment, status: 'IN_TRANSIT', purchaseOrderId: 'po-1' })

    await transitionShipment('exp-1', { toStatus: 'IN_TRANSIT' }, ADMIN)

    expect(poUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'po-1', statut: 'ENVOYEE' },
        data: expect.objectContaining({ statut: 'EN_TRANSIT' }),
      }),
    )
  })

  it('ne touche pas au bon de commande sur les autres étapes', async () => {
    shipmentFindUnique.mockResolvedValue({ ...shipment, status: 'CUSTOMS' })
    shipmentUpdate.mockResolvedValue({ status: 'LOCAL_DELIVERY', purchaseOrderId: 'po-1' })

    await transitionShipment('exp-1', { toStatus: 'LOCAL_DELIVERY' }, ADMIN)

    expect(poUpdateMany).not.toHaveBeenCalled()
  })

  it('refuse une transition interdite', async () => {
    shipmentFindUnique.mockResolvedValue({ ...shipment, status: 'DELIVERED' })
    await expect(
      transitionShipment('exp-1', { toStatus: 'IN_TRANSIT' }, ADMIN),
    ).rejects.toMatchObject({ code: 'SHIPMENT_INVALID_TRANSITION', statusCode: 409 })
  })

  it('refuse un saut d\'étape (SOURCING → DELIVERED)', async () => {
    shipmentFindUnique.mockResolvedValue({ ...shipment, status: 'SOURCING' })
    await expect(transitionShipment('exp-1', { toStatus: 'DELIVERED' }, ADMIN)).rejects.toMatchObject(
      { code: 'SHIPMENT_INVALID_TRANSITION' },
    )
  })

  it('refuse une transition vers l\'état courant', async () => {
    shipmentFindUnique.mockResolvedValue(shipment)
    await expect(transitionShipment('exp-1', { toStatus: 'COLLECTED' }, ADMIN)).rejects.toMatchObject(
      { code: 'SHIPMENT_SAME_STATUS' },
    )
  })
})

describe('updateShipment', () => {
  it('recalcule le lien de suivi et le coût total', async () => {
    shipmentFindUnique.mockResolvedValue({
      id: 'exp-1',
      carrier: 'TRANSITAIRE',
      trackingNumber: null,
      freightCostFcfa: null,
      customsCostFcfa: null,
      lastMileCostFcfa: null,
    })
    shipmentUpdate.mockImplementation(async (args: { data: Record<string, unknown> }) => args.data)

    const data = (await updateShipment('exp-1', {
      carrier: 'FEDEX',
      trackingNumber: '778899',
      freightCostFcfa: 40000,
      customsCostFcfa: 25000,
      lastMileCostFcfa: 2000,
    })) as unknown as { trackingUrl: string; totalCostFcfa: number }

    expect(data.trackingUrl).toContain('fedex.com')
    expect(data.totalCostFcfa).toBe(67000)
  })
})

describe('getShipmentPublic', () => {
  const events = [
    {
      id: 'e1',
      toStatus: 'IN_TRANSIT',
      label: 'En transit',
      location: 'Dubaï',
      occurredAt: new Date('2026-08-01T00:00:00Z'),
    },
  ]

  it('accepte le bon jeton et masque le transitaire', async () => {
    const token = 'a'.repeat(48)
    shipmentFindUnique.mockResolvedValue({
      reference: 'EXP-20260803-AAAA',
      status: 'IN_TRANSIT',
      carrier: 'TRANSITAIRE',
      carrierOther: 'Transitaire XYZ',
      trackingNumber: 'LTA-123',
      trackingUrl: null,
      etaAt: null,
      departedAt: null,
      customsClearedAt: null,
      arrivedAt: null,
      deliveredAt: null,
      publicTokenHash: hashToken(token),
      events,
    })

    const result = await getShipmentPublic('EXP-20260803-AAAA', token)

    expect(result.carrierLabel).toBe('Notre partenaire logistique')
    // Un numéro de LTA transitaire ne doit pas fuiter côté client.
    expect(result.trackingNumber).toBeNull()
    expect(result.events).toHaveLength(1)
    expect(result).not.toHaveProperty('freightCostFcfa')
  })

  it('404 sur mauvais jeton — aucune énumération possible', async () => {
    shipmentFindUnique.mockResolvedValue({
      reference: 'EXP-20260803-AAAA',
      publicTokenHash: hashToken('bon-jeton'),
      events: [],
    })
    await expect(getShipmentPublic('EXP-20260803-AAAA', 'mauvais-jeton')).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('expose le numéro DHL, lui, au client', () => {
    const result = toPublicShipment({
      reference: 'EXP-1',
      status: 'IN_TRANSIT',
      carrier: 'DHL',
      carrierOther: null,
      trackingNumber: '1234567890',
      trackingUrl: 'https://dhl.example/1234567890',
      etaAt: null,
      departedAt: null,
      customsClearedAt: null,
      arrivedAt: null,
      deliveredAt: null,
      events: [],
    })

    expect(result.carrierLabel).toBe('DHL Express')
    expect(result.trackingNumber).toBe('1234567890')
  })
})

describe('getShipmentForQuoteRequest', () => {
  it('renvoie null quand la cotation n\'a pas d\'expédition', async () => {
    shipmentFindFirst.mockResolvedValue(null)
    expect(await getShipmentForQuoteRequest('lead-1')).toBeNull()
  })

  it('ignore les expéditions annulées', async () => {
    shipmentFindFirst.mockResolvedValue(null)
    await getShipmentForQuoteRequest('lead-1')
    expect(shipmentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { quoteRequestId: 'lead-1', status: { not: 'CANCELLED' } },
      }),
    )
  })
})

describe('notifyShipmentUpdate', () => {
  it('envoie le libellé public de l\'étape au demandeur', async () => {
    shipmentFindUnique.mockResolvedValue({
      id: 'exp-1',
      reference: 'EXP-1',
      status: 'CUSTOMS',
      etaAt: null,
      quoteRequest: { reference: 'LOG-0308-AAAA', whatsapp: '+2250700000000', phone: null },
    })
    mockNotifyWhatsAppUser.mockResolvedValue({ sent: true, channel: 'cloud' })

    const result = await notifyShipmentUpdate('exp-1')

    expect(result.sent).toBe(true)
    const [phone, text] = mockNotifyWhatsAppUser.mock.calls[0] as [string, string]
    expect(phone).toBe('+2250700000000')
    expect(text).toContain('LOG-0308-AAAA')
    expect(text).toContain('Formalités douanières')
  })

  it('422 sans numéro rattaché', async () => {
    shipmentFindUnique.mockResolvedValue({ id: 'exp-1', status: 'CUSTOMS', quoteRequest: null })
    await expect(notifyShipmentUpdate('exp-1')).rejects.toMatchObject({
      code: 'SHIPMENT_NO_CONTACT',
    })
  })
})
