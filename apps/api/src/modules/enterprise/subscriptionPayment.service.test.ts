import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const vehicleCount = vi.fn()
const subFindFirst = vi.fn()
const subCreate = vi.fn()
const subUpdate = vi.fn()
const eventCreate = vi.fn()
const eventCreateMany = vi.fn()
const enterpriseFindUnique = vi.fn()
const payCreate = vi.fn()
const payUpdate = vi.fn()
const payFindUnique = vi.fn()
const payFindMany = vi.fn()
const memberFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    vehicle: { count: (...a: unknown[]) => vehicleCount(...a) },
    enterprise: { findUnique: (...a: unknown[]) => enterpriseFindUnique(...a) },
    enterpriseMember: { findUnique: (...a: unknown[]) => memberFindUnique(...a) },
    enterpriseSubscription: {
      findFirst: (...a: unknown[]) => subFindFirst(...a),
      create: (...a: unknown[]) => subCreate(...a),
      update: (...a: unknown[]) => subUpdate(...a),
      updateMany: vi.fn(),
    },
    enterpriseSubscriptionEvent: {
      create: (...a: unknown[]) => eventCreate(...a),
      createMany: (...a: unknown[]) => eventCreateMany(...a),
    },
    subscriptionPayment: {
      create: (...a: unknown[]) => payCreate(...a),
      update: (...a: unknown[]) => payUpdate(...a),
      findUnique: (...a: unknown[]) => payFindUnique(...a),
      findMany: (...a: unknown[]) => payFindMany(...a),
    },
  },
}))

const initCinetPayPayment = vi.fn()
vi.mock('../../lib/cinetpay.js', async () => {
  const actual = await vi.importActual<typeof import('../../lib/cinetpay.js')>(
    '../../lib/cinetpay.js',
  )
  return { ...actual, initCinetPayPayment: (...a: unknown[]) => initCinetPayPayment(...a) }
})

const {
  addMonths,
  paymentIdFromTransactionId,
  isSubscriptionTransaction,
  quoteSubscriptionPayment,
  initSubscriptionPayment,
  confirmSubscriptionPayment,
  markSubscriptionPaymentFailed,
  listSubscriptionPayments,
  SUBSCRIPTION_TX_PREFIX,
} = await import('./subscriptionPayment.service.js')

beforeEach(() => {
  for (const m of [
    vehicleCount,
    subFindFirst,
    subCreate,
    subUpdate,
    eventCreate,
    eventCreateMany,
    enterpriseFindUnique,
    payCreate,
    payUpdate,
    payFindUnique,
    payFindMany,
    memberFindUnique,
    initCinetPayPayment,
  ]) {
    m.mockReset()
  }
  memberFindUnique.mockResolvedValue({ role: 'OWNER' })
  enterpriseFindUnique.mockResolvedValue({ name: 'Transports Yopougon' })
  subFindFirst.mockResolvedValue(null)
  payUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: 'pay-1', ...data }),
  )
})

describe('référence de transaction', () => {
  it('distingue un abonnement d\'une commande', () => {
    expect(isSubscriptionTransaction(`${SUBSCRIPTION_TX_PREFIX}_abc_123`)).toBe(true)
    expect(isSubscriptionTransaction('pieces_order-1_123')).toBe(false)
  })

  it('extrait l\'id de paiement', () => {
    expect(paymentIdFromTransactionId(`${SUBSCRIPTION_TX_PREFIX}_pay-9_1700000000`)).toBe('pay-9')
    expect(paymentIdFromTransactionId('pieces_order-1_123')).toBeNull()
  })
})

describe('addMonths', () => {
  it('cale sur la fin de mois quand le jour n\'existe pas', () => {
    expect(addMonths(new Date('2026-01-31T10:00:00Z'), 1).getMonth()).toBe(1) // février
    expect(addMonths(new Date('2026-01-31T10:00:00Z'), 1).getDate()).toBeLessThanOrEqual(29)
  })

  it('ajoute 12 mois pour un cycle annuel', () => {
    const d = addMonths(new Date('2026-03-15T00:00:00Z'), 12)
    expect(d.getFullYear()).toBe(2027)
    expect(d.getMonth()).toBe(2)
  })
})

describe('quoteSubscriptionPayment', () => {
  it('facture le mensuel au nombre de véhicules', async () => {
    vehicleCount.mockResolvedValue(12)
    const q = await quoteSubscriptionPayment('ent-1', { tier: 'PRO_FLOTTE', billingCycle: 'MONTHLY' })
    expect(q.amount).toBe(12 * 4900)
    expect(q.monthsBilled).toBe(1)
  })

  it('facture 10 mois sur un cycle annuel (2 mois offerts) mais couvre 12 mois', async () => {
    vehicleCount.mockResolvedValue(10)
    const now = new Date('2026-08-01T00:00:00Z')
    const q = await quoteSubscriptionPayment(
      'ent-1',
      { tier: 'PRO_FLOTTE_PLUS', billingCycle: 'ANNUAL' },
      now,
    )
    expect(q.amount).toBe(10 * 9900 * 10)
    expect(q.periodEnd.getFullYear()).toBe(2027)
  })

  it('refuse le niveau gratuit', async () => {
    await expect(
      quoteSubscriptionPayment('ent-1', { tier: 'FREE', billingCycle: 'MONTHLY' }),
    ).rejects.toMatchObject({ code: 'SUBSCRIPTION_TIER_FREE' })
  })

  it('refuse une flotte vide — le tarif est au véhicule', async () => {
    vehicleCount.mockResolvedValue(0)
    await expect(
      quoteSubscriptionPayment('ent-1', { tier: 'PRO_FLOTTE', billingCycle: 'MONTHLY' }),
    ).rejects.toMatchObject({ code: 'SUBSCRIPTION_NO_VEHICLE' })
  })

  it('démarre la période à la fin de l\'essai en cours, pas aujourd\'hui', async () => {
    vehicleCount.mockResolvedValue(3)
    const now = new Date('2026-08-01T00:00:00Z')
    const trialEnd = new Date('2026-08-20T00:00:00Z')
    subFindFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'TRIALING',
      trialEndsAt: trialEnd,
      currentPeriodEnd: null,
    })
    const q = await quoteSubscriptionPayment(
      'ent-1',
      { tier: 'PRO_FLOTTE', billingCycle: 'MONTHLY' },
      now,
    )
    expect(q.periodStart.toISOString()).toBe(trialEnd.toISOString())
  })

  it('ignore une période déjà expirée', async () => {
    vehicleCount.mockResolvedValue(3)
    const now = new Date('2026-08-01T00:00:00Z')
    subFindFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'ACTIVE',
      trialEndsAt: null,
      currentPeriodEnd: new Date('2026-07-01T00:00:00Z'),
    })
    const q = await quoteSubscriptionPayment(
      'ent-1',
      { tier: 'PRO_FLOTTE', billingCycle: 'MONTHLY' },
      now,
    )
    expect(q.periodStart.toISOString()).toBe(now.toISOString())
  })
})

describe('initSubscriptionPayment', () => {
  beforeEach(() => {
    vehicleCount.mockResolvedValue(5)
    payCreate.mockResolvedValue({ id: 'pay-1' })
    initCinetPayPayment.mockResolvedValue({
      transactionId: 'x',
      paymentUrl: 'https://checkout.cinetpay.com/x',
      status: 'pending',
    })
  })

  it('refuse un gestionnaire — engager la dépense est réservé', async () => {
    memberFindUnique.mockResolvedValue({ role: 'MANAGER' })
    await expect(
      initSubscriptionPayment('ent-1', 'u-1', {
        tier: 'PRO_FLOTTE',
        billingCycle: 'MONTHLY',
        operator: 'ORANGE_MONEY',
        payerPhone: '+2250700000000',
      }),
    ).rejects.toMatchObject({ code: 'ENTERPRISE_INSUFFICIENT_ROLE' })
  })

  it('refuse un mécanicien', async () => {
    memberFindUnique.mockResolvedValue({ role: 'MECHANIC' })
    await expect(
      initSubscriptionPayment('ent-1', 'u-1', {
        tier: 'PRO_FLOTTE',
        billingCycle: 'MONTHLY',
        operator: 'WAVE',
        payerPhone: '+2250700000000',
      }),
    ).rejects.toMatchObject({ code: 'ENTERPRISE_INSUFFICIENT_ROLE' })
  })

  it('crée la ligne avant l\'appel réseau et renvoie l\'URL de paiement', async () => {
    const res = await initSubscriptionPayment('ent-1', 'u-1', {
      tier: 'PRO_FLOTTE',
      billingCycle: 'MONTHLY',
      operator: 'MOOV_MONEY',
      payerPhone: '+2250100000000',
    })
    expect(payCreate).toHaveBeenCalled()
    expect(payCreate.mock.invocationCallOrder[0]).toBeLessThan(
      initCinetPayPayment.mock.invocationCallOrder[0],
    )
    expect(res.payment.paymentUrl).toBe('https://checkout.cinetpay.com/x')
    expect(res.quote.amount).toBe(5 * 4900)
  })

  it('envoie une référence préfixée abonnement au canal mobile money', async () => {
    await initSubscriptionPayment('ent-1', 'u-1', {
      tier: 'PRO_FLOTTE',
      billingCycle: 'MONTHLY',
      operator: 'MTN_MOMO',
      payerPhone: '+2250500000000',
    })
    const arg = initCinetPayPayment.mock.calls[0][0] as { transactionId: string; channels: string }
    expect(arg.transactionId.startsWith(`${SUBSCRIPTION_TX_PREFIX}_pay-1_`)).toBe(true)
    expect(arg.channels).toBe('MOBILE_MONEY')
  })

  it('marque la tentative en échec si CinetPay refuse l\'init', async () => {
    initCinetPayPayment.mockResolvedValue({
      transactionId: 'x',
      paymentUrl: null,
      status: 'error',
      error: 'MINIMUM_REQUIRED_FIELDS',
    })
    await expect(
      initSubscriptionPayment('ent-1', 'u-1', {
        tier: 'PRO_FLOTTE',
        billingCycle: 'MONTHLY',
        operator: 'ORANGE_MONEY',
        payerPhone: '+2250700000000',
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_INIT_FAILED' })
    expect(payUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    )
  })
})

describe('confirmSubscriptionPayment', () => {
  const basePayment = {
    id: 'pay-1',
    enterpriseId: 'ent-1',
    transactionId: `${SUBSCRIPTION_TX_PREFIX}_pay-1_1`,
    amount: 24_500,
    tier: 'PRO_FLOTTE' as const,
    billingCycle: 'MONTHLY' as const,
    operator: 'ORANGE_MONEY' as const,
    status: 'PENDING' as const,
    periodStart: null,
    periodEnd: null,
  }

  it('est idempotent : un second webhook ne reprolonge pas', async () => {
    payFindUnique.mockResolvedValue({ ...basePayment, status: 'PAID' })
    const res = await confirmSubscriptionPayment(basePayment.transactionId, 24_500)
    expect(res?.status).toBe('PAID')
    expect(subUpdate).not.toHaveBeenCalled()
    expect(subCreate).not.toHaveBeenCalled()
  })

  it('rejette un montant inférieur et marque l\'échec', async () => {
    payFindUnique.mockResolvedValue(basePayment)
    await expect(
      confirmSubscriptionPayment(basePayment.transactionId, 10_000),
    ).rejects.toMatchObject({ code: 'PAYMENT_AMOUNT_MISMATCH' })
    expect(payUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    )
    expect(subUpdate).not.toHaveBeenCalled()
  })

  it('active un abonnement existant et pose la fin de période', async () => {
    payFindUnique.mockResolvedValue(basePayment)
    subFindFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'TRIALING',
      trialEndsAt: null,
      currentPeriodEnd: null,
    })
    await confirmSubscriptionPayment(basePayment.transactionId, 24_500)
    expect(subUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ status: 'ACTIVE', tier: 'PRO_FLOTTE' }),
      }),
    )
    const kinds = (eventCreateMany.mock.calls[0][0] as { data: Array<{ kind: string }> }).data.map(
      (e) => e.kind,
    )
    expect(kinds).toContain('PAYMENT_RECEIVED')
    expect(kinds).toContain('ACTIVATED')
  })

  it('journalise un renouvellement quand l\'abonnement était déjà actif', async () => {
    payFindUnique.mockResolvedValue(basePayment)
    subFindFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'ACTIVE',
      trialEndsAt: null,
      currentPeriodEnd: null,
    })
    await confirmSubscriptionPayment(basePayment.transactionId, 24_500)
    const kinds = (eventCreateMany.mock.calls[0][0] as { data: Array<{ kind: string }> }).data.map(
      (e) => e.kind,
    )
    expect(kinds).toContain('RENEWED')
  })

  it('crée un abonnement actif quand aucun n\'existe', async () => {
    payFindUnique.mockResolvedValue(basePayment)
    subFindFirst.mockResolvedValue(null)
    subCreate.mockResolvedValue({ id: 'sub-new' })
    await confirmSubscriptionPayment(basePayment.transactionId, 24_500)
    expect(subCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE', enterpriseId: 'ent-1' }),
      }),
    )
  })

  it('retient l\'opérateur réellement utilisé, pas celui choisi dans l\'interface', async () => {
    payFindUnique.mockResolvedValue(basePayment)
    subFindFirst.mockResolvedValue(null)
    subCreate.mockResolvedValue({ id: 'sub-new' })
    await confirmSubscriptionPayment(basePayment.transactionId, 24_500, 'WAVECI')
    expect(payUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ operator: 'WAVE' }) }),
    )
  })

  it('repart de maintenant si la période prévue est déjà entamée', async () => {
    const past = new Date('2020-01-01T00:00:00Z')
    payFindUnique.mockResolvedValue({ ...basePayment, periodStart: past })
    subFindFirst.mockResolvedValue(null)
    subCreate.mockResolvedValue({ id: 'sub-new' })
    await confirmSubscriptionPayment(basePayment.transactionId, 24_500)
    const data = payUpdate.mock.calls[0][0].data as { periodStart: Date }
    expect(data.periodStart.getTime()).toBeGreaterThan(past.getTime())
  })

  it('404 sur une transaction inconnue', async () => {
    payFindUnique.mockResolvedValue(null)
    await expect(confirmSubscriptionPayment('piecesabo_nope_1', 1000)).rejects.toMatchObject({
      code: 'SUBSCRIPTION_PAYMENT_NOT_FOUND',
    })
  })
})

describe('markSubscriptionPaymentFailed', () => {
  it('ne dégrade jamais un paiement déjà encaissé', async () => {
    payFindUnique.mockResolvedValue({ id: 'pay-1', status: 'PAID' })
    await markSubscriptionPaymentFailed('piecesabo_pay-1_1', 'REFUSED')
    expect(payUpdate).not.toHaveBeenCalled()
  })
})

describe('listSubscriptionPayments', () => {
  it('refuse un mécanicien', async () => {
    memberFindUnique.mockResolvedValue({ role: 'MECHANIC' })
    await expect(listSubscriptionPayments('ent-1', 'u-1')).rejects.toMatchObject({
      code: 'ENTERPRISE_INSUFFICIENT_ROLE',
    })
  })

  it('laisse passer le comptable', async () => {
    memberFindUnique.mockResolvedValue({ role: 'ACCOUNTANT' })
    payFindMany.mockResolvedValue([])
    await expect(listSubscriptionPayments('ent-1', 'u-1')).resolves.toEqual([])
  })
})
