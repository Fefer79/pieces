import { describe, it, expect } from 'vitest'
import {
  buildTrackingUrl,
  publicCarrierLabel,
  canTransitionShipment,
  SHIPMENT_FLOW,
  SHIPMENT_STATUSES,
  SHIPMENT_CARRIER_KEYS,
} from './carriers'

describe('buildTrackingUrl', () => {
  it('construit l\'URL des intégrateurs mondiaux', () => {
    expect(buildTrackingUrl('DHL', '1234567890')).toContain('tracking-id=1234567890')
    expect(buildTrackingUrl('FEDEX', '778899')).toContain('trknbr=778899')
    expect(buildTrackingUrl('UPS', '1Z999')).toContain('tracknum=1Z999')
  })

  it('encode le numéro', () => {
    expect(buildTrackingUrl('DHL', 'AB 12/34')).toContain('AB%2012%2F34')
  })

  it('renvoie null sans page publique ou sans numéro', () => {
    expect(buildTrackingUrl('TRANSITAIRE', 'LTA-123')).toBeNull()
    expect(buildTrackingUrl('AIR_CARGO', '057-12345678')).toBeNull()
    expect(buildTrackingUrl('DHL', null)).toBeNull()
    expect(buildTrackingUrl('DHL', '   ')).toBeNull()
  })
})

describe('publicCarrierLabel', () => {
  it('nomme les transporteurs que le client peut suivre lui-même', () => {
    expect(publicCarrierLabel('DHL')).toBe('DHL Express')
  })

  it('n\'expose JAMAIS le nom du transitaire partenaire', () => {
    expect(publicCarrierLabel('TRANSITAIRE', 'Transitaire XYZ')).toBe('Notre partenaire logistique')
    expect(publicCarrierLabel('AIR_CARGO', 'Cargo ABC')).toBe('Fret aérien')
    expect(publicCarrierLabel('OTHER', 'Untel & Fils')).toBe('Notre partenaire logistique')
  })
})

describe('machine à états des expéditions', () => {
  it('avance étape par étape dans la frise', () => {
    expect(canTransitionShipment('SOURCING', 'COLLECTED')).toBe(true)
    expect(canTransitionShipment('COLLECTED', 'IN_TRANSIT')).toBe(true)
    expect(canTransitionShipment('IN_TRANSIT', 'CUSTOMS')).toBe(true)
    expect(canTransitionShipment('CUSTOMS', 'LOCAL_DELIVERY')).toBe(true)
    expect(canTransitionShipment('LOCAL_DELIVERY', 'DELIVERED')).toBe(true)
  })

  it('interdit les sauts d\'étape', () => {
    expect(canTransitionShipment('SOURCING', 'DELIVERED')).toBe(false)
    expect(canTransitionShipment('COLLECTED', 'CUSTOMS')).toBe(false)
  })

  it('autorise un retour d\'une étape (correction ops)', () => {
    expect(canTransitionShipment('IN_TRANSIT', 'COLLECTED')).toBe(true)
    expect(canTransitionShipment('CUSTOMS', 'IN_TRANSIT')).toBe(true)
  })

  it('fige les états terminaux', () => {
    expect(canTransitionShipment('DELIVERED', 'IN_TRANSIT')).toBe(false)
    expect(canTransitionShipment('CANCELLED', 'IN_TRANSIT')).toBe(false)
  })

  it('permet d\'annuler tant que ce n\'est pas livré', () => {
    for (const status of SHIPMENT_FLOW.filter((s) => s !== 'DELIVERED')) {
      expect(canTransitionShipment(status, 'CANCELLED')).toBe(true)
    }
    expect(canTransitionShipment('DELIVERED', 'CANCELLED')).toBe(false)
  })
})

describe('cohérence du référentiel', () => {
  it('chaque transporteur a un libellé public', () => {
    for (const key of SHIPMENT_CARRIER_KEYS) {
      expect(publicCarrierLabel(key).length).toBeGreaterThan(0)
    }
  })

  it('les étapes qui horodatent pointent un champ réel de Shipment', () => {
    const fields = ['departedAt', 'customsClearedAt', 'arrivedAt', 'deliveredAt']
    for (const spec of Object.values(SHIPMENT_STATUSES)) {
      if (spec.timestampField) expect(fields).toContain(spec.timestampField)
    }
  })
})
