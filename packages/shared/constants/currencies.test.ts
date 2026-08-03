import { describe, it, expect } from 'vitest'
import { toFcfa, isCurrencyCode, CURRENCY_RATES_FCFA } from './currencies'

describe('toFcfa', () => {
  it('applique la parité fixe XOF/EUR', () => {
    // 1 € = 655,957 F, inchangé depuis 1999.
    expect(CURRENCY_RATES_FCFA.EUR).toBe(655.957)
    expect(toFcfa(100, 'EUR')).toBe(65596)
    expect(toFcfa(1, 'EUR')).toBe(656)
  })

  it('laisse le FCFA inchangé', () => {
    expect(toFcfa(12_500, 'XOF')).toBe(12500)
  })

  it('arrondit à l\'entier — les montants FCFA n\'ont pas de décimales', () => {
    expect(Number.isInteger(toFcfa(33.33, 'AED'))).toBe(true)
  })

  it('renvoie null plutôt qu\'un total faux sur une devise inconnue', () => {
    expect(toFcfa(100, 'JPY')).toBeNull()
    expect(toFcfa(100, null)).toBeNull()
  })

  it('renvoie null sur un montant absent ou non fini', () => {
    expect(toFcfa(null, 'EUR')).toBeNull()
    expect(toFcfa(undefined, 'EUR')).toBeNull()
    expect(toFcfa(Number.NaN, 'EUR')).toBeNull()
  })

  it('accepte zéro (une offre peut être affichée à 0 avant correction ops)', () => {
    expect(toFcfa(0, 'EUR')).toBe(0)
  })
})

describe('isCurrencyCode', () => {
  it('reconnaît les devises d\'achat courantes', () => {
    expect(isCurrencyCode('AED')).toBe(true)
    expect(isCurrencyCode('CNY')).toBe(true)
    expect(isCurrencyCode('eur')).toBe(false) // sensible à la casse, comme les codes ISO
  })
})

describe('taux entier du bon de commande', () => {
  /**
   * `PurchaseOrder.tauxChange` est un `Int` : on documente ici l'écart que cet
   * arrondi introduit, pour qu'il soit constaté plutôt que découvert.
   */
  it('reste sous 3 % sur la devise la plus défavorable (TRY)', () => {
    const exact = CURRENCY_RATES_FCFA.TRY
    const rounded = Math.round(exact)
    expect(Math.abs(rounded - exact) / exact).toBeLessThan(0.03)
  })

  it('n\'arrondit jamais un taux à zéro (min 1 côté validateur BC)', () => {
    for (const rate of Object.values(CURRENCY_RATES_FCFA)) {
      expect(Math.round(rate)).toBeGreaterThanOrEqual(1)
    }
  })
})
