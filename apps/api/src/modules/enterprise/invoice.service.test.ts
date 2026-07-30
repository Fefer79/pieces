import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const invoiceFindUnique = vi.fn()
const invoiceFindMany = vi.fn()
const invoiceCreate = vi.fn()
const invoiceCount = vi.fn()
const orderFindUnique = vi.fn()
const enterpriseFindUnique = vi.fn()
const enterpriseMemberFindUnique = vi.fn()
const monthlyUpsert = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    invoice: {
      findUnique: (...a: unknown[]) => invoiceFindUnique(...a),
      findMany: (...a: unknown[]) => invoiceFindMany(...a),
      create: (...a: unknown[]) => invoiceCreate(...a),
      count: (...a: unknown[]) => invoiceCount(...a),
    },
    order: { findUnique: (...a: unknown[]) => orderFindUnique(...a) },
    enterprise: { findUnique: (...a: unknown[]) => enterpriseFindUnique(...a) },
    enterpriseMember: { findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a) },
    enterpriseMonthlyInvoice: { upsert: (...a: unknown[]) => monthlyUpsert(...a) },
  },
}))

const {
  getOrCreateInvoiceForOrder,
  listInvoicesForEnterprise,
  getInvoicePdf,
  getMonthlyInvoicePdf,
  exportFecCsv,
} = await import('./invoice.service.js')

const ENTERPRISE = 'ent-1'
const USER = 'user-1'

function asMember(role: string | null) {
  enterpriseMemberFindUnique.mockResolvedValue(role ? { role } : null)
}

beforeEach(() => {
  vi.clearAllMocks()
  invoiceFindMany.mockResolvedValue([])
  invoiceCount.mockResolvedValue(0)
  enterpriseFindUnique.mockResolvedValue({
    id: ENTERPRISE,
    name: 'Transports Yopougon SARL',
    commune: 'Yopougon',
    address: 'Rue 12',
    rccm: 'CI-ABJ-2024-B-1234',
  })
})

describe('accès aux documents comptables', () => {
  // Avant ce lot, ces quatre fonctions appelaient assertMember sans rôle :
  // n'importe quel mécanicien exportait la comptabilité de la flotte.
  const cases = [
    ['listInvoicesForEnterprise', () => listInvoicesForEnterprise(ENTERPRISE, USER)],
    ['getMonthlyInvoicePdf', () => getMonthlyInvoicePdf(ENTERPRISE, 2026, 7, USER)],
    ['exportFecCsv', () => exportFecCsv(ENTERPRISE, 2026, 7, USER)],
  ] as const

  it.each(cases)('%s refuse un MECHANIC', async (_name, call) => {
    asMember('MECHANIC')
    await expect(call()).rejects.toMatchObject({
      code: 'ENTERPRISE_INSUFFICIENT_ROLE',
      statusCode: 403,
    })
  })

  it.each(cases)('%s refuse un non-membre', async (_name, call) => {
    asMember(null)
    await expect(call()).rejects.toMatchObject({
      code: 'ENTERPRISE_FORBIDDEN',
      statusCode: 403,
    })
  })

  it('le comptable peut lister les factures', async () => {
    asMember('ACCOUNTANT')
    await expect(listInvoicesForEnterprise(ENTERPRISE, USER)).resolves.toEqual([])
  })

  it('le comptable peut exporter le FEC', async () => {
    asMember('ACCOUNTANT')
    const csv = await exportFecCsv(ENTERPRISE, 2026, 7, USER)
    expect(csv).toContain('NumeroFacture')
  })

  it('le gestionnaire n’a pas accès au FEC — c’est une pièce comptable', async () => {
    asMember('MANAGER')
    await expect(exportFecCsv(ENTERPRISE, 2026, 7, USER)).rejects.toMatchObject({
      code: 'ENTERPRISE_INSUFFICIENT_ROLE',
    })
  })

  it('le gestionnaire garde l’accès aux factures', async () => {
    asMember('MANAGER')
    await expect(listInvoicesForEnterprise(ENTERPRISE, USER)).resolves.toEqual([])
  })
})

describe('getInvoicePdf', () => {
  const INVOICE = {
    id: 'inv-1',
    enterpriseId: ENTERPRISE,
    invoiceNumber: 'PCS-202607-00001',
    issuedAt: new Date('2026-07-15T10:00:00Z'),
    subtotalHt: 84746,
    tvaRate: 18,
    tvaAmount: 15254,
    totalTtc: 100000,
    fneValidationNumber: null,
    order: {
      id: 'ord-1',
      initiatorId: 'someone-else',
      totalAmount: 100000,
      deliveryFee: 3500,
      laborCost: null,
      paidAt: new Date('2026-07-15T09:00:00Z'),
      items: [],
      vehicle: null,
      enterprise: null,
    },
  }

  it('refuse un MECHANIC de la flotte', async () => {
    invoiceFindUnique.mockResolvedValue(INVOICE)
    asMember('MECHANIC')
    await expect(getInvoicePdf('inv-1', USER, ENTERPRISE)).rejects.toMatchObject({
      code: 'ENTERPRISE_INSUFFICIENT_ROLE',
    })
  })

  it("ne fuit pas une facture d'une autre entreprise, même à un membre légitime", async () => {
    invoiceFindUnique.mockResolvedValue(INVOICE)
    asMember('OWNER')
    // La facture appartient à ENTERPRISE mais on la demande via ent-autre.
    await expect(getInvoicePdf('inv-1', USER, 'ent-autre')).rejects.toMatchObject({
      code: 'INVOICE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('renvoie 404 sur une facture inexistante', async () => {
    invoiceFindUnique.mockResolvedValue(null)
    await expect(getInvoicePdf('inconnue', USER)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('getOrCreateInvoiceForOrder', () => {
  it('est idempotent : une commande déjà facturée ne réémet pas', async () => {
    invoiceFindUnique.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'PCS-202607-00001' })

    const res = await getOrCreateInvoiceForOrder('ord-1')

    expect(res).toMatchObject({ id: 'inv-1' })
    expect(invoiceCreate).not.toHaveBeenCalled()
  })

  it('refuse d’émettre pour une commande non payée', async () => {
    invoiceFindUnique.mockResolvedValue(null)
    orderFindUnique.mockResolvedValue({ id: 'ord-1', totalAmount: 100000, paidAt: null })

    await expect(getOrCreateInvoiceForOrder('ord-1')).rejects.toMatchObject({
      code: 'ORDER_NOT_PAID',
      statusCode: 400,
    })
  })

  it('décompose le TTC en HT + TVA cohérents avec le montant encaissé', async () => {
    invoiceFindUnique.mockResolvedValue(null)
    orderFindUnique.mockResolvedValue({
      id: 'ord-1',
      enterpriseId: ENTERPRISE,
      totalAmount: 100000,
      paidAt: new Date(),
    })
    invoiceCreate.mockImplementation((args: { data: Record<string, number> }) => args.data)

    const invoice = (await getOrCreateInvoiceForOrder('ord-1')) as unknown as {
      subtotalHt: number
      tvaAmount: number
      totalTtc: number
    }

    // La somme doit retomber exactement sur ce que le client a payé.
    expect(invoice.subtotalHt + invoice.tvaAmount).toBe(100000)
    expect(invoice.totalTtc).toBe(100000)
  })
})
