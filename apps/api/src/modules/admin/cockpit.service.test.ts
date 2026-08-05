import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPrismaMock } from '../../test/prismaMock.js'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

const { prismaMock, model, resetAll } = createPrismaMock()
vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

const { getCockpit } = await import('./cockpit.service.js')

const NOW = new Date()
const thisMonth = (day = 15) => new Date(NOW.getFullYear(), NOW.getMonth(), day)

/** Valeurs par défaut : tous les compteurs à zéro, aucune facture. */
function seed(
  invoices: Array<{ issuedAt: Date; totalTtc: number; enterpriseId: string | null }> = [],
) {
  model('invoice').aggregate.mockResolvedValue({
    _sum: { totalTtc: 0, subtotalHt: 0, tvaAmount: 0 },
    _count: { _all: 0 },
  })
  model('invoice').findMany.mockResolvedValue(
    invoices.map((i) => ({ ...i, subtotalHt: Math.round(i.totalTtc / 1.18) })),
  )
  for (const m of [
    'order',
    'logisticsQuoteRequest',
    'enterpriseSubscription',
    'vehicle',
    'vendorContact',
    'vendor',
    'enterprise',
  ]) {
    model(m).count.mockResolvedValue(0)
  }
}

describe('getCockpit', () => {
  beforeEach(() => {
    resetAll()
    seed()
  })

  it('rend une série du nombre de mois demandé, mois vides compris', async () => {
    const data = await getCockpit({ months: 3 })
    expect(data.serieCa).toHaveLength(3)
    expect(data.serieCa.every((b) => typeof b.mois === 'string')).toBe(true)
  })

  it('sépare marketplace et flotte sur la répartition du mois', async () => {
    seed([
      { issuedAt: thisMonth(), totalTtc: 100_000, enterpriseId: null },
      { issuedAt: thisMonth(), totalTtc: 250_000, enterpriseId: 'ent-1' },
    ])

    const data = await getCockpit({ months: 6 })
    const parBu = Object.fromEntries(data.repartitionMois.map((r) => [r.businessUnit, r.ca]))
    expect(parBu.MARKETPLACE).toBe(100_000)
    expect(parBu.FLOTTE).toBe(250_000)
  })

  it('montre toujours les deux lignes, même filtré sur une seule', async () => {
    // C'est la vue de direction : filtrer la page ne doit pas masquer l'autre
    // moitié de l'activité dans la répartition.
    seed([{ issuedAt: thisMonth(), totalTtc: 100_000, enterpriseId: null }])
    const data = await getCockpit({ months: 6, businessUnit: 'FLOTTE' })
    expect(data.repartitionMois.map((r) => r.businessUnit)).toEqual(['MARKETPLACE', 'FLOTTE'])
  })

  it('restreint les factures aux commandes sans entreprise pour MARKETPLACE', async () => {
    await getCockpit({ months: 6, businessUnit: 'MARKETPLACE' })
    const where = model('invoice').aggregate.mock.calls[0]?.[0]?.where
    expect(where.enterpriseId).toBeNull()
  })

  it('ne restreint pas les factures pour LOGISTIQUE — elle n’en produit pas', async () => {
    await getCockpit({ months: 6, businessUnit: 'LOGISTIQUE' })
    const where = model('invoice').aggregate.mock.calls[0]?.[0]?.where
    expect(where.enterpriseId).toBeUndefined()
  })

  it('calcule le panier moyen à partir du nombre de factures', async () => {
    model('invoice').aggregate.mockResolvedValueOnce({
      _sum: { totalTtc: 300_000, subtotalHt: 254_237, tvaAmount: 45_763 },
      _count: { _all: 4 },
    })
    const data = await getCockpit({ months: 6 })
    expect(data.ventes.panierMoyen).toBe(75_000)
  })

  it('ne divise pas par zéro quand le mois est vide', async () => {
    const data = await getCockpit({ months: 6 })
    expect(data.ventes.panierMoyen).toBe(0)
    expect(data.ventes.evolutionPct).toBeNull()
  })

  it('rend l’évolution en pourcentage face au mois précédent', async () => {
    model('invoice')
      .aggregate.mockResolvedValueOnce({
        _sum: { totalTtc: 150_000, subtotalHt: 127_119, tvaAmount: 22_881 },
        _count: { _all: 2 },
      })
      .mockResolvedValueOnce({ _sum: { totalTtc: 100_000 } })

    const data = await getCockpit({ months: 6 })
    expect(data.ventes.evolutionPct).toBe(50)
  })

  it('laisse evolutionPct à null plutôt que d’annoncer une croissance infinie', async () => {
    model('invoice')
      .aggregate.mockResolvedValueOnce({
        _sum: { totalTtc: 150_000, subtotalHt: 127_119, tvaAmount: 22_881 },
        _count: { _all: 2 },
      })
      .mockResolvedValueOnce({ _sum: { totalTtc: null } })

    const data = await getCockpit({ months: 6 })
    expect(data.ventes.evolutionPct).toBeNull()
  })
})
