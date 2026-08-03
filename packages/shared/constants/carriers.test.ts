import { describe, it, expect } from 'vitest'
import {
  buildTrackingUrl,
  publicCarrierLabel,
  canTransitionShipment,
  SHIPMENT_CARRIERS,
  CARRIERS,
} from './carriers'
import { toFcfa, currencyRate, EUR_XOF_PARITY } from './currencies'

describe('buildTrackingUrl', () => {
  it('construit le lien des intégrateurs mondiaux', () => {
    expect(buildTrackingUrl('DHL', '1234567890')).toContain('1234567890')
    expect(buildTrackingUrl('FEDEX', 'ABC')).toContain('fedex.com')
    expect(buildTrackingUrl('UPS', 'ABC')).toContain('ups.com')
  })

  it('encode le numéro pour ne pas casser l\'URL', () => {
    expect(buildTrackingUrl('DHL', 'A B/C')).toContain('A%20B%2FC')
  })

  it('renvoie null sans numéro ou sans gabarit', () => {
    expect(buildTrackingUrl('DHL', null)).toBeNull()
    expect(buildTrackingUrl('DHL', '  ')).toBeNull()
    expect(buildTrackingUrl('TRANSITAIRE', 'AWB-1')).toBeNull()
    expect(buildTrackingUrl('SEA_LCL', 'X')).toBeNull()
  })
})

describe('publicCarrierLabel', () => {
  it('ne nomme jamais le partenaire transitaire', () => {
    for (const carrier of SHIPMENT_CARRIERS) {
      const label = publicCarrierLabel(carrier)
      if (CARRIERS[carrier].publicNamed) {
        expect(label).toBe(CARRIERS[carrier].label)
      } else {
        expect(label).toBe('Notre partenaire logistique')
      }
    }
  })

  it('seuls DHL, FedEx et UPS sont nommables', () => {
    const named = SHIPMENT_CARRIERS.filter((c) => CARRIERS[c].publicNamed)
    expect(named).toEqual(['DHL', 'FEDEX', 'UPS'])
  })
})

describe('canTransitionShipment', () => {
  it('autorise la marche avant, y compris en sautant une étape', () => {
    expect(canTransitionShipment('SOURCING', 'COLLECTED')).toBe(true)
    expect(canTransitionShipment('IN_TRANSIT', 'LOCAL_DELIVERY')).toBe(true)
    expect(canTransitionShipment('CUSTOMS', 'DELIVERED')).toBe(true)
  })

  it('interdit tout retour en arrière', () => {
    expect(canTransitionShipment('DELIVERED', 'IN_TRANSIT')).toBe(false)
    expect(canTransitionShipment('CUSTOMS', 'COLLECTED')).toBe(false)
  })

  it('les états terminaux sont définitifs', () => {
    expect(canTransitionShipment('DELIVERED', 'CANCELLED')).toBe(false)
    expect(canTransitionShipment('CANCELLED', 'IN_TRANSIT')).toBe(false)
  })

  it('l\'annulation reste possible tant que rien n\'est livré', () => {
    expect(canTransitionShipment('SOURCING', 'CANCELLED')).toBe(true)
    expect(canTransitionShipment('LOCAL_DELIVERY', 'CANCELLED')).toBe(true)
  })
})

describe('toFcfa', () => {
  it('applique la parité fixe XOF/EUR', () => {
    expect(currencyRate('EUR')).toBe(EUR_XOF_PARITY)
    expect(toFcfa(100, 'EUR')).toBe(65_596)
  })

  it('accepte la casse et les taux surchargés', () => {
    expect(toFcfa(10, 'usd', { USD: 600 })).toBe(6_000)
    expect(toFcfa(10, 'USD', { USD: 612 })).toBe(6_120)
  })

  it('renvoie null plutôt qu\'un montant faux', () => {
    expect(toFcfa(100, 'ZZZ')).toBeNull()
    expect(toFcfa(null, 'EUR')).toBeNull()
    expect(toFcfa(100, null)).toBeNull()
    expect(toFcfa(-5, 'EUR')).toBeNull()
  })

  it('ignore un taux surchargé invalide', () => {
    expect(toFcfa(10, 'USD', { USD: 0 })).toBe(6_000)
  })
})
