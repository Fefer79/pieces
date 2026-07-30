import { vi } from 'vitest'

// Fabrique de mock Prisma partagée.
//
// Le problème qu'elle résout : `buildApp()` enregistre tous les modules, donc
// dès qu'un test de routes boote l'app, n'importe quel modèle touché pendant la
// requête doit exister sur le mock. Chaque test énumérait donc sa propre liste
// partielle, et l'ajout d'un modèle au schéma cassait des tests sans rapport
// avec la fonctionnalité ajoutée.
//
// Utilisation :
//
//   const { prismaMock, model } = createPrismaMock()
//   vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))
//   // puis, dans le test :
//   model('task').findMany.mockResolvedValueOnce([...])
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

/**
 * Tous les modèles du schéma, en camelCase comme les délégués Prisma.
 *
 * ⚠ Ajouter ici tout nouveau modèle. C'est le seul endroit à toucher : les
 *   tests qui utilisent cette fabrique n'ont alors rien à changer.
 */
export const PRISMA_MODELS = [
  'user',
  'activityLog',
  'vendor',
  'vendorGuaranteeSignature',
  'vendorKyc',
  'vendorContract',
  'dataDeletionRequest',
  'catalogItem',
  'catalogItemFitment',
  'catalogItemPhoto',
  'job',
  'enterprise',
  'invoice',
  'enterpriseMonthlyInvoice',
  'enterpriseSubscription',
  'enterpriseSubscriptionEvent',
  'enterpriseBufferStock',
  'partRequest',
  'partRequestPhoto',
  'partRequestEvent',
  'maintenanceCenter',
  'enterpriseMember',
  'maintenanceSchedule',
  'vehicle',
  'returnOrder',
  'sellerReview',
  'deliveryReview',
  'dispute',
  'searchSynonym',
  'order',
  'orderItem',
  'orderEvent',
  'delivery',
  'escrowTransaction',
  'notificationPreference',
  'vehicleMake',
  'vehicleModel',
  'vehicleGeneration',
  'vehicleEngine',
  'partCategory',
  'partReference',
  'partReferenceFitment',
  'marketPriceObservation',
  'competitorVendor',
  'driver',
  'driverAssignment',
  'driverDailyRecord',
  'driverIncident',
  'partEnrichment',
  'crossReference',
  'manufacturerContact',
  'vendorContact',
  'contactActivity',
  'vendorContactLink',
  'logisticsQuoteRequest',
  'logisticsQuoteRequestPhoto',
  'logisticsQuoteRequestEvent',
  // ERP
  'staffMember',
  'task',
  'note',
  'sequence',
] as const

export type PrismaModelName = (typeof PRISMA_MODELS)[number]

export interface PrismaMock {
  prismaMock: Record<string, unknown>
  /** Accès typé à un délégué pour poser les valeurs de retour. */
  model: (name: PrismaModelName) => MockDelegate
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
  // Par défaut, `$transaction(cb)` exécute le callback avec le mock lui-même :
  // les services transactionnels restent testables sans configuration.
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

  $transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => unknown)(prismaMock)
    }
    // Forme tableau : `$transaction([p1, p2])`.
    return Promise.all(arg as unknown[])
  })

  function model(name: PrismaModelName): MockDelegate {
    const delegate = delegates.get(name)
    // Échafaudage de test : erreur de programmation à la rédaction du test, pas
    // une erreur d'API. AppError sérialiserait un code HTTP là où on veut juste
    // une stack claire.
    // eslint-disable-next-line no-restricted-syntax
    if (!delegate) throw new Error(`Modèle absent du mock Prisma : ${name}`)
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
    $transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)(prismaMock)
      }
      return Promise.all(arg as unknown[])
    })
  }

  return { prismaMock, model, resetAll, $queryRaw, $executeRaw, $transaction }
}
