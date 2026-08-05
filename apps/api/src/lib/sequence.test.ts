import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockQueryRaw = vi.fn()

vi.mock('./prisma.js', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}))

const { nextSequence, formatDocumentNumber } = await import('./sequence.js')

// `prisma.$queryRaw` est appelé en tag de littéral gabarit : le mock reçoit
// donc `(strings, ...values)`. On lit les deux séparément.
function sqlOf(call = 0): string {
  return ((mockQueryRaw.mock.calls[call]?.[0] as string[]) ?? []).join(' ')
}

function valuesOf(call = 0): unknown[] {
  return (mockQueryRaw.mock.calls[call] ?? []).slice(1)
}

describe('nextSequence', () => {
  beforeEach(() => {
    mockQueryRaw.mockReset()
  })

  it('rend 1 au premier appel de la période', async () => {
    // L'INSERT stocke 2 (la valeur suivante) et renvoie 2 ; on rend 2 - 1.
    mockQueryRaw.mockResolvedValueOnce([{ next_value: 2 }])
    await expect(nextSequence('INVOICE', new Date('2026-07-15T10:00:00Z'))).resolves.toBe(1)
  })

  it('incrémente aux appels suivants', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ next_value: 3 }])
    await expect(nextSequence('INVOICE')).resolves.toBe(2)

    mockQueryRaw.mockResolvedValueOnce([{ next_value: 12 }])
    await expect(nextSequence('INVOICE')).resolves.toBe(11)
  })

  it('n’émet qu’UNE requête — c’est ce qui rend l’opération atomique', async () => {
    // Une lecture suivie d'une écriture rouvrirait la course que ce service
    // corrige : deux factures simultanées avec le même numéro.
    mockQueryRaw.mockResolvedValueOnce([{ next_value: 2 }])
    await nextSequence('INVOICE')
    expect(mockQueryRaw).toHaveBeenCalledTimes(1)
  })

  it('utilise ON CONFLICT DO UPDATE plutôt qu’un SELECT préalable', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ next_value: 2 }])
    await nextSequence('INVOICE')
    const sql = sqlOf()
    expect(sql).toContain('INSERT INTO')
    expect(sql).toContain('ON CONFLICT')
    expect(sql).toContain('DO UPDATE')
    expect(sql).toContain('RETURNING')
    // Un SELECT préalable signifierait qu'on est revenu au schéma lire-puis-écrire.
    expect(sql).not.toContain('SELECT')
  })

  it('sérialise deux appels concurrents en deux numéros distincts', async () => {
    // Simule le verrou de ligne Postgres : la base rend deux valeurs
    // consécutives, jamais la même.
    mockQueryRaw
      .mockResolvedValueOnce([{ next_value: 2 }])
      .mockResolvedValueOnce([{ next_value: 3 }])
    const [a, b] = await Promise.all([nextSequence('INVOICE'), nextSequence('INVOICE')])
    expect(new Set([a, b]).size).toBe(2)
    expect([a, b].sort()).toEqual([1, 2])
  })

  it('scope la période au mois par défaut', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ next_value: 2 }])
    await nextSequence('INVOICE', new Date(2026, 6, 15))
    expect(valuesOf()).toEqual(['INVOICE', 2026, 7])
  })

  it('scope à l’année quand on le demande', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ next_value: 2 }])
    await nextSequence('JOURNAL_ENTRY', new Date(2026, 6, 15), { period: 'YEARLY' })
    expect(valuesOf()).toEqual(['JOURNAL_ENTRY', 2026, 0])
  })

  it('utilise année 0 / mois 0 pour un compteur global', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ next_value: 2 }])
    await nextSequence('PURCHASE_ORDER', new Date(2026, 6, 15), { period: 'GLOBAL' })
    expect(valuesOf()).toEqual(['PURCHASE_ORDER', 0, 0])
  })

  it('lève une AppError si la base ne renvoie rien', async () => {
    mockQueryRaw.mockResolvedValueOnce([])
    await expect(nextSequence('INVOICE')).rejects.toMatchObject({
      code: 'SEQUENCE_UNAVAILABLE',
      statusCode: 500,
    })
  })
})

describe('formatDocumentNumber', () => {
  it('reproduit exactement le format historique des factures', () => {
    expect(formatDocumentNumber('PCS', new Date(2026, 6, 15), 1)).toBe('PCS-202607-00001')
    expect(formatDocumentNumber('PCS', new Date(2026, 6, 15), 42)).toBe('PCS-202607-00042')
  })

  it('complète le mois sur deux chiffres', () => {
    expect(formatDocumentNumber('PCS', new Date(2026, 0, 1), 7)).toBe('PCS-202601-00007')
  })

  it('ne tronque pas au-delà de cinq chiffres', () => {
    expect(formatDocumentNumber('PCS', new Date(2026, 6, 1), 123456)).toBe('PCS-202607-123456')
  })

  it('accepte d’autres préfixes de document', () => {
    expect(formatDocumentNumber('BC', new Date(2026, 6, 1), 3)).toBe('BC-202607-00003')
  })
})
