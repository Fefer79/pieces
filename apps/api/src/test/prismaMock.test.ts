import { describe, it, expect } from 'vitest'
import { createPrismaMock, PRISMA_MODELS } from './prismaMock.js'

describe('createPrismaMock', () => {
  it('couvre tous les modèles du schéma, pas une liste écrite à la main', () => {
    // Le point de la fabrique : un modèle ajouté au schéma est mocké sans que
    // personne ait à l'inscrire quelque part.
    expect(PRISMA_MODELS.length).toBeGreaterThan(70)
    expect(PRISMA_MODELS).toContain('teamMemberProfile')
    expect(PRISMA_MODELS).toContain('sequence')
    expect(PRISMA_MODELS).toContain('purchaseOrder')
  })

  it('expose les méthodes de délégué sur chaque modèle', () => {
    const { model } = createPrismaMock()
    expect(model('order').findUnique).toBeTypeOf('function')
    expect(model('order').groupBy).toBeTypeOf('function')
  })

  it('signale un nom de modèle inconnu au lieu de rendre undefined', () => {
    const { model } = createPrismaMock()
    expect(() => model('inexistant')).toThrowError(/Modèle absent/)
  })

  it('exécute $transaction(callback) avec le mock lui-même', async () => {
    const { prismaMock, model, $transaction } = createPrismaMock()
    model('order').findUnique.mockResolvedValueOnce({ id: 'ord-1' })

    const result = await ($transaction as (cb: unknown) => Promise<unknown>)(
      async (tx: Record<string, { findUnique: (a: unknown) => Promise<unknown> }>) =>
        tx.order!.findUnique({ where: { id: 'ord-1' } }),
    )

    expect(result).toEqual({ id: 'ord-1' })
    expect(prismaMock.order).toBe(model('order'))
  })

  it('résout la forme tableau de $transaction', async () => {
    const { $transaction } = createPrismaMock()
    await expect(
      ($transaction as (a: unknown) => Promise<unknown>)([Promise.resolve(1), Promise.resolve(2)]),
    ).resolves.toEqual([1, 2])
  })

  it('resetAll vide la file des valeurs …Once', () => {
    // `clearAllMocks` ne le fait pas : une valeur posée par un test précédent
    // fuirait dans le suivant. Après reset, l'appel ne rend plus la promesse
    // programmée mais `undefined`.
    const { model, resetAll } = createPrismaMock()
    model('order').findUnique.mockResolvedValueOnce({ id: 'fuite' })
    resetAll()
    expect(model('order').findUnique()).toBeUndefined()
  })
})
