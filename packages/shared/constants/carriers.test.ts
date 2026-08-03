import { describe, it, expect } from 'vitest'
import {
  buildTrackingUrl,
  isCarrierPublic,
  publicCarrierLabel,
  canTransitionShipment,
  CARRIER_PUBLIC_FALLBACK,
  SHIPMENT_STATUSES,
  type ShipmentCarrierCode,
  type ShipmentStatusCode,
} from './carriers'

describe('isCarrierPublic / publicCarrierLabel', () => {
  it('nomme les trois intégrateurs mondiaux', () => {
    for (const c of ['DHL', 'FEDEX', 'UPS'] as ShipmentCarrierCode[]) {
      expect(isCarrierPublic(c)).toBe(true)
    }
    expect(publicCarrierLabel('DHL')).toBe('DHL Express')
  })

  it('n\'expose JAMAIS le transitaire partenaire', () => {
    expect(isCarrierPublic('TRANSITAIRE')).toBe(false)
    expect(publicCarrierLabel('TRANSITAIRE')).toBe(CARRIER_PUBLIC_FALLBACK)
    expect(publicCarrierLabel('TRANSITAIRE')).not.toMatch(/transitaire/i)
  })

  it('masque tout ce qui n\'est pas explicitement public', () => {
    for (const c of ['TRANSITAIRE', 'AIR_CARGO', 'SEA_LCL', 'POSTAL', 'OTHER'] as ShipmentCarrierCode[]) {
      expect(publicCarrierLabel(c)).toBe(CARRIER_PUBLIC_FALLBACK)
    }
  })

  it('masque aussi une valeur absente ou inconnue', () => {
    expect(publicCarrierLabel(null)).toBe(CARRIER_PUBLIC_FALLBACK)
    expect(publicCarrierLabel('UN_NOUVEAU_TRANSPORTEUR')).toBe(CARRIER_PUBLIC_FALLBACK)
  })
})

describe('buildTrackingUrl', () => {
  it('construit le lien public des transporteurs qui en ont un', () => {
    expect(buildTrackingUrl('DHL', '1234567890')).toContain('1234567890')
    expect(buildTrackingUrl('FEDEX', 'ABC')).toContain('fedex.com')
    expect(buildTrackingUrl('UPS', 'ABC')).toContain('ups.com')
  })

  it('encode le numéro pour ne pas casser l\'URL', () => {
    expect(buildTrackingUrl('DHL', 'A B&C')).toContain('A%20B%26C')
  })

  it('renvoie null sans page publique exploitable', () => {
    expect(buildTrackingUrl('TRANSITAIRE', 'DOS-42')).toBeNull()
    expect(buildTrackingUrl('SEA_LCL', 'X')).toBeNull()
  })

  it('renvoie null quand le numéro manque', () => {
    expect(buildTrackingUrl('DHL', null)).toBeNull()
    expect(buildTrackingUrl('DHL', '  ')).toBeNull()
  })
})

describe('canTransitionShipment', () => {
  it('suit les étapes du doc §4 dans l\'ordre', () => {
    expect(canTransitionShipment('SOURCING', 'COLLECTED')).toBe(true)
    expect(canTransitionShipment('COLLECTED', 'IN_TRANSIT')).toBe(true)
    expect(canTransitionShipment('IN_TRANSIT', 'CUSTOMS')).toBe(true)
    expect(canTransitionShipment('CUSTOMS', 'LOCAL_DELIVERY')).toBe(true)
    expect(canTransitionShipment('LOCAL_DELIVERY', 'DELIVERED')).toBe(true)
  })

  it('tolère de sauter la douane (envoi déjà dédouané)', () => {
    expect(canTransitionShipment('IN_TRANSIT', 'LOCAL_DELIVERY')).toBe(true)
  })

  it('refuse les sauts et les retours en arrière', () => {
    expect(canTransitionShipment('SOURCING', 'DELIVERED')).toBe(false)
    expect(canTransitionShipment('CUSTOMS', 'COLLECTED')).toBe(false)
  })

  it('verrouille les états terminaux', () => {
    for (const s of SHIPMENT_STATUSES) {
      expect(canTransitionShipment('DELIVERED', s as ShipmentStatusCode)).toBe(false)
      expect(canTransitionShipment('CANCELLED', s as ShipmentStatusCode)).toBe(false)
    }
  })

  it('permet l\'annulation depuis tout état non terminal', () => {
    for (const s of ['SOURCING', 'COLLECTED', 'IN_TRANSIT', 'CUSTOMS', 'LOCAL_DELIVERY'] as ShipmentStatusCode[]) {
      expect(canTransitionShipment(s, 'CANCELLED')).toBe(true)
    }
  })
})
