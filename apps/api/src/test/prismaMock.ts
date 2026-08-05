import { vi } from 'vitest'
import { Prisma } from '@prisma/client'

// Fabrique de mock Prisma partagée.
//
// Le problème qu'elle résout : `buildApp()` enregistre tous les modules, donc
// dès qu'un test de routes boote l'app, n'importe quel modèle touché pendant la
// requête doit exister sur le mock. Chaque test énumérait donc sa propre liste
// partielle, et l'ajout d'un modèle — ou d'une simple requête dans une garde
// partagée — cassait des tests sans rapport avec la fonctionnalité ajoutée.
// C'est arrivé en ajoutant `requireCapability` : douze fichiers de test à
// rustiner un par un pour un `teamMemberProfile` manquant.
//
// ⚠ La liste des modèles vient du DMMF du client généré, jamais d'un tableau
//   écrit à la main : un modèle ajouté au schéma est couvert dès le prochain
//   `db:generate`, sans qu'on ait à penser à l'inscrire quelque part.
//
// Utilisation :
//
//   const { prismaMock, model, resetAll } = createPrismaMock()
//   vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))
//   beforeEach(resetAll)
//   // puis, dans le test :
//   model('order').findUnique.mockResolvedValueOnce({ id: 'ord-1' })
//
// ⚠ `vi.mock` est hissé : la fabrique doit être appelée avant, au niveau du
//   module, comme dans les tests existants.

/** Méthodes exposées par un délégué de modèle Prisma. */
const DELEGATE_METHODS = [
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
] as const

type DelegateMethod = (typeof DELEGATE_METHODS)[number]

export type MockDelegate = Record<DelegateMethod, ReturnType<typeof vi.fn>>

/** Nom de délégué Prisma : `PurchaseOrder` → `purchaseOrder`. */
function delegateName(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1)
}

/** Tous les modèles du schéma, en camelCase comme les délégués Prisma. */
export const PRISMA_MODELS: readonly string[] = Prisma.dmmf.datamodel.models.map((m) =>
  delegateName(m.name),
)

export interface PrismaMock {
  prismaMock: Record<string, unknown>
  /** Accès à un délégué pour poser les valeurs de retour. */
  model: (name: string) => MockDelegate
  /** Réinitialise tous les mocks — vide aussi la file des `…Once`. */
  resetAll: () => void
  $queryRaw: ReturnType<typeof vi.fn>
  $executeRaw: ReturnType<typeof vi.fn>
  $transaction: ReturnType<typeof vi.fn>
}

export function createPrismaMock(): PrismaMock {
  const delegates = new Map<string, MockDelegate>()

  for (const name of PRISMA_MODELS) {
    const delegate = {} as MockDelegate
    for (const method of DELEGATE_METHODS) {
      delegate[method] = vi.fn()
    }
    delegates.set(name, delegate)
  }

  const $queryRaw = vi.fn()
  const $executeRaw = vi.fn()
  const $transaction = vi.fn()

  const prismaMock: Record<string, unknown> = {
    $queryRaw,
    $executeRaw,
    $transaction,
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  }
  for (const [name, delegate] of delegates) {
    prismaMock[name] = delegate
  }

  // Par défaut, `$transaction(cb)` exécute le callback avec le mock lui-même :
  // les services transactionnels restent testables sans configuration.
  function runTransaction(arg: unknown) {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => unknown)(prismaMock)
    }
    // Forme tableau : `$transaction([p1, p2])`.
    return Promise.all(arg as unknown[])
  }
  $transaction.mockImplementation(async (arg: unknown) => runTransaction(arg))

  function model(name: string): MockDelegate {
    const delegate = delegates.get(name)
    // Échafaudage de test : erreur de programmation à la rédaction du test, pas
    // une erreur d'API. AppError sérialiserait un code HTTP là où on veut juste
    // une stack claire.
    // eslint-disable-next-line no-restricted-syntax
    if (!delegate) throw new Error(`Modèle absent du schéma Prisma : ${name}`)
    return delegate
  }

  function resetAll() {
    for (const delegate of delegates.values()) {
      for (const method of DELEGATE_METHODS) {
        // `mockReset` (et non `clearAllMocks`) : seul lui vide la file des
        // `mockResolvedValueOnce`, sinon une valeur posée par un test précédent
        // fuit dans le suivant.
        delegate[method].mockReset()
      }
    }
    $queryRaw.mockReset()
    $executeRaw.mockReset()
    $transaction.mockReset()
    $transaction.mockImplementation(async (arg: unknown) => runTransaction(arg))
  }

  return { prismaMock, model, resetAll, $queryRaw, $executeRaw, $transaction }
}
