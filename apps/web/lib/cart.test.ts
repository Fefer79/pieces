import { describe, it, expect } from 'vitest'
import { parse, parseMode } from './cart'

// Le délai choisi transite par localStorage entre la fiche produit, le panier et
// la commande : une valeur absente ou corrompue ne doit jamais tarifer au hasard.
describe('parseMode', () => {
  it('accepte les trois délais', () => {
    expect(parseMode('ECO')).toBe('ECO')
    expect(parseMode('STANDARD')).toBe('STANDARD')
    expect(parseMode('EXPRESS')).toBe('EXPRESS')
  })

  it('retombe sur Standard quand rien n’est stocké', () => {
    expect(parseMode(null)).toBe('STANDARD')
    expect(parseMode('')).toBe('STANDARD')
  })

  it('retombe sur Standard sur une valeur corrompue plutôt que de tarifer au hasard', () => {
    expect(parseMode('express')).toBe('STANDARD')
    expect(parseMode('GRATUIT')).toBe('STANDARD')
  })
})

describe('parse — provenance des articles', () => {
  it('conserve supplyMode et originCountry', () => {
    const raw = JSON.stringify([
      {
        catalogItemId: 'a',
        vendorId: 'v',
        price: 1000,
        quantity: 1,
        supplyMode: 'IMPORT',
        originCountry: 'DE',
      },
    ])
    expect(parse(raw)[0]).toMatchObject({ supplyMode: 'IMPORT', originCountry: 'DE' })
  })

  it('retombe sur LOCAL quand la provenance est absente ou inconnue', () => {
    const sans = JSON.stringify([{ catalogItemId: 'a', vendorId: 'v', quantity: 1 }])
    expect(parse(sans)[0]!.supplyMode).toBe('LOCAL')
    const bidon = JSON.stringify([
      { catalogItemId: 'a', vendorId: 'v', quantity: 1, supplyMode: 'BOGUS' },
    ])
    expect(parse(bidon)[0]!.supplyMode).toBe('LOCAL')
  })
})
