import { describe, it, expect, vi } from 'vitest'
import { importPartnerShopName, loadOpistoItems, resolveOpistoVendorId, withDbRetry } from './opisto.ts'
import type { OpistoNormalized } from '../normalizers/opisto.ts'

const item = (over: Partial<OpistoNormalized> = {}): OpistoNormalized => ({
  externalSource: 'OPISTO_FR',
  externalSourceId: '88962594',
  externalSourceUrl: 'https://www.opisto.fr/fr/auto/fiche-produit/88962594/alternateur-peugeot-208-1-2020',
  casseId: '4759',
  name: 'Alternateur PEUGEOT 208',
  category: 'Alternateur',
  oemReference: '9820893880',
  vehicleCompatibility: 'PEUGEOT 208 1 PHASE 2 1.5 BLUE HDI',
  sourceCostAmount: 28,
  sourceCostCurrency: 'EUR',
  sourceCostFcfa: 18367,
  importMarginPct: 100,
  price: 36700,
  originCountry: 'FR',
  warrantyValue: 12,
  warrantyUnit: 'MONTH',
  imageOriginalUrl: null,
  fitments: [{ brand: 'PEUGEOT', model: '208', yearFrom: 2020, yearTo: 2020 }],
  ...over,
})

const fakeDb = () => {
  const vendorUpsert = vi.fn(async ({ create }: { create: { shopName: string } }) => ({
    id: `vendor-${create.shopName}`,
  }))
  let seq = 0
  const catalogUpsert = vi.fn(async () => ({ id: `item-${(seq += 1)}` }))
  const fitmentDelete = vi.fn(async () => ({ count: 0 }))
  const fitmentCreate = vi.fn(async () => ({ count: 1 }))
  return {
    db: {
      vendor: { upsert: vendorUpsert },
      catalogItem: { upsert: catalogUpsert },
      catalogItemFitment: { deleteMany: fitmentDelete, createMany: fitmentCreate },
      // Les upserts du lot sont deja lances par le mock : il suffit de les joindre
      // en preservant l'ordre, comme le fait `$transaction` avec un tableau.
      $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
    } as never,
    vendorUpsert,
    catalogUpsert,
    fitmentDelete,
    fitmentCreate,
  }
}

describe('importPartnerShopName', () => {
  // Les casses d'Opisto sont des tiers sans accord avec nous : leur raison
  // sociale ne doit jamais devenir un nom de vendeur Pièces.
  it('never exposes the upstream breaker name', () => {
    const name = importPartnerShopName('4759', 'FR')
    expect(name).not.toMatch(/JAQU|AUTO -|Opisto/i)
    expect(name).toBe('Partenaire import France #4759')
  })

  it('names the real origin country', () => {
    expect(importPartnerShopName('6357', 'ES')).toBe('Partenaire import Espagne #6357')
  })

  it('falls back without a breaker id', () => {
    expect(importPartnerShopName(null, 'FR')).toBe('Partenaire import France')
  })
})

describe('resolveOpistoVendorId', () => {
  it('creates one import-partner vendor per breaker, keyed on the Opisto id', async () => {
    const { db, vendorUpsert } = fakeDb()
    await resolveOpistoVendorId({ casseId: '4759', originCountry: 'FR' }, db, new Map())
    const arg = vendorUpsert.mock.calls[0]?.[0] as {
      where: { uq_vendors_external_seller: { externalSellerId: string } }
      create: { isImportPartner: boolean; originCountry: string }
    }
    expect(arg.where.uq_vendors_external_seller.externalSellerId).toBe('4759')
    expect(arg.create.isImportPartner).toBe(true)
    expect(arg.create.originCountry).toBe('FR')
  })

  it('upserts a breaker only once per run', async () => {
    const { db, vendorUpsert } = fakeDb()
    const cache = new Map<string, string>()
    const seller = { casseId: '4759', originCountry: 'FR' }
    await resolveOpistoVendorId(seller, db, cache)
    await resolveOpistoVendorId(seller, db, cache)
    expect(vendorUpsert).toHaveBeenCalledTimes(1)
  })
})

describe('loadOpistoItems', () => {
  it('writes the part as an import, keeping the purchase cost internal', async () => {
    const { db, catalogUpsert } = fakeDb()
    await loadOpistoItems([item()], db)
    const arg = catalogUpsert.mock.calls[0]?.[0] as {
      create: { supplyMode: string; condition: string; partSource: string; sourceCostFcfa: number; price: number }
    }
    expect(arg.create.supplyMode).toBe('IMPORT')
    expect(arg.create.condition).toBe('USED')
    expect(arg.create.partSource).toBe('OEM')
    expect(arg.create.sourceCostFcfa).toBe(18367)
    expect(arg.create.price).toBe(36700)
  })

  it('replaces fitments wholesale to stay in step with upstream', async () => {
    const { db, fitmentDelete, fitmentCreate } = fakeDb()
    const stats = await loadOpistoItems([item()], db)
    expect(fitmentDelete).toHaveBeenCalledTimes(1)
    expect(fitmentCreate).toHaveBeenCalledTimes(1)
    expect(stats.fitmentsCreated).toBe(1)
    expect(stats.itemsUpserted).toBe(1)
  })

  it('groups parts from the same breaker under one vendor', async () => {
    const { db, vendorUpsert } = fakeDb()
    const stats = await loadOpistoItems(
      [item(), item({ externalSourceId: '99', casseId: '4759' }), item({ externalSourceId: '100', casseId: '6357', originCountry: 'ES' })],
      db,
    )
    expect(vendorUpsert).toHaveBeenCalledTimes(2)
    expect(stats.vendorIds).toHaveLength(2)
  })
})

describe('withDbRetry', () => {
  // P1017 est l'erreur qui a coupé le premier run complet.
  it('retries and reconnects after a lost connection', async () => {
    const reconnect = vi.fn(async () => undefined)
    const run = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Server has closed the connection'), { code: 'P1017' }))
      .mockResolvedValueOnce('ok')
    expect(await withDbRetry('test', run, reconnect)).toBe('ok')
    expect(run).toHaveBeenCalledTimes(2)
    expect(reconnect).toHaveBeenCalledTimes(1)
  })

  it('recognizes a dropped connection by message alone', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error('read ECONNRESET'))
      .mockResolvedValueOnce('ok')
    expect(await withDbRetry('test', run)).toBe('ok')
    expect(run).toHaveBeenCalledTimes(2)
  })

  // Rejouer une erreur métier donnerait le même échec en masquant le vrai défaut.
  it('never retries a business error', async () => {
    const run = vi.fn().mockRejectedValue(Object.assign(new Error('Unique constraint'), { code: 'P2002' }))
    await expect(withDbRetry('test', run)).rejects.toThrow('Unique constraint')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('gives up after the attempt ceiling instead of looping forever', async () => {
    const run = vi.fn().mockRejectedValue(Object.assign(new Error('closed the connection'), { code: 'P1017' }))
    await expect(withDbRetry('test', run)).rejects.toThrow('closed the connection')
    expect(run).toHaveBeenCalledTimes(5)
    // Ce test attend vraiment le backoff complet (500+1000+2000+4000 ms).
  }, 15_000)
})

describe('loadOpistoItems batching', () => {
  // Le correctif de fond : 3 requêtes par LOT, plus 3 par pièce.
  it('groups writes so roundtrips scale with chunks, not items', async () => {
    const { db, catalogUpsert, fitmentDelete, fitmentCreate } = fakeDb()
    const items = Array.from({ length: 250 }, (_, i) =>
      item({ externalSourceId: String(i), casseId: '4759' }),
    )
    const stats = await loadOpistoItems(items, db, { chunkSize: 100 })

    expect(stats.itemsUpserted).toBe(250)
    // 250 pièces => 3 lots (100/100/50), donc 3 purges et 3 écritures de fitments.
    expect(fitmentDelete).toHaveBeenCalledTimes(3)
    expect(fitmentCreate).toHaveBeenCalledTimes(3)
    // Les upserts restent un par pièce, mais groupés en 3 allers-retours.
    expect(catalogUpsert).toHaveBeenCalledTimes(250)
  })

  it('purges the fitments of the whole chunk in one call', async () => {
    const { db, fitmentDelete } = fakeDb()
    await loadOpistoItems(
      [item({ externalSourceId: 'a' }), item({ externalSourceId: 'b' })],
      db,
      { chunkSize: 100 },
    )
    const arg = fitmentDelete.mock.calls[0]?.[0] as { where: { catalogItemId: { in: string[] } } }
    expect(arg.where.catalogItemId.in).toHaveLength(2)
  })

  // `$transaction` préserve l'ordre : sans ça les fitments partiraient sur la
  // mauvaise pièce, un bug silencieux et difficile à rattraper.
  it('maps each fitment to its own item', async () => {
    const { db, fitmentCreate } = fakeDb()
    await loadOpistoItems(
      [
        item({ externalSourceId: 'a', fitments: [{ brand: 'TOYOTA', model: 'Yaris', yearFrom: 2010, yearTo: 2010 }] }),
        item({ externalSourceId: 'b', fitments: [{ brand: 'PEUGEOT', model: '208', yearFrom: 2020, yearTo: 2020 }] }),
      ],
      db,
      { chunkSize: 100 },
    )
    const data = (fitmentCreate.mock.calls[0]?.[0] as { data: { catalogItemId: string; model: string }[] }).data
    expect(data).toHaveLength(2)
    expect(data[0]?.catalogItemId).not.toBe(data[1]?.catalogItemId)
    expect(data.find((f) => f.model === 'Yaris')?.catalogItemId).toBe(data[0]?.catalogItemId)
  })
})
