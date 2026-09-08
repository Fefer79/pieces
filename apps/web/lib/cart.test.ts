import { describe, it, expect } from 'vitest'
import { parseMode } from './cart'

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
