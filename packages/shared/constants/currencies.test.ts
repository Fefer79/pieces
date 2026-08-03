import { describe, it, expect } from 'vitest'
import {
  toFcfa,
  normalizeCurrency,
  formatCurrencyAmount,
  CURRENCY_RATES_FCFA,
} from './currencies'

describe('normalizeCurrency', () => {
  it('accepte les codes ISO quelle que soit la casse', () => {
    expect(normalizeCurrency('usd')).toBe('USD')
    expect(normalizeCurrency('EUR')).toBe('EUR')
  })

  it('accepte les symboles et alias courants', () => {
    expect(normalizeCurrency('€')).toBe('EUR')
    expect(normalizeCurrency('$')).toBe('USD')
    expect(normalizeCurrency('RMB')).toBe('CNY')
    expect(normalizeCurrency('CFA')).toBe('FCFA')
  })

  it('renvoie null sur une devise inconnue plutôt que de deviner', () => {
    expect(normalizeCurrency('ZWL')).toBeNull()
    expect(normalizeCurrency(null)).toBeNull()
    expect(normalizeCurrency('')).toBeNull()
  })
})

describe('toFcfa', () => {
  it('applique la parité fixe de l\'euro', () => {
    // 100 € × 655,957 = 65 595,7 → arrondi à la centaine
    expect(toFcfa(100, 'EUR')).toBe(65600)
  })

  it('laisse FCFA inchangé', () => {
    expect(toFcfa(15000, 'FCFA')).toBe(15000)
    expect(toFcfa(15000, 'XOF')).toBe(15000)
  })

  it('arrondit à la centaine', () => {
    expect(toFcfa(120, 'USD')).toBe(120 * CURRENCY_RATES_FCFA.USD)
    expect(toFcfa(1, 'USD') ?? 0).toBe(600)
  })

  it('ne remplace jamais un prix absent par zéro', () => {
    expect(toFcfa(null, 'USD')).toBeNull()
    expect(toFcfa(undefined, 'USD')).toBeNull()
    expect(toFcfa(120, null)).toBeNull()
    expect(toFcfa(120, 'ZWL')).toBeNull()
    expect(toFcfa(Number.NaN, 'USD')).toBeNull()
  })
})

describe('formatCurrencyAmount', () => {
  it('affiche le montant et le code normalisé', () => {
    // toLocaleString('fr-FR') insère une espace insécable U+00A0.
    expect(formatCurrencyAmount(1200, '$')).toMatch(/1.200 USD/)
  })

  it('renvoie null sans montant', () => {
    expect(formatCurrencyAmount(null, 'USD')).toBeNull()
  })
})
