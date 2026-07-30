import { describe, it, expect } from 'vitest'
import {
  ERP_PREFIX,
  ERP_PASSTHROUGH,
  isErpHost,
  isErpPassthrough,
  toErpInternalPath,
  isErpSurface,
} from './erp-routes'
import { isLogistiqueHost, isLogistiqueSlug } from './logistique-routes'
import { spaceForPath, spacesForRoles } from './spaces'

describe('isErpHost', () => {
  it('reconnaît le sous-domaine de production', () => {
    expect(isErpHost('erp.pieces.ci')).toBe(true)
  })

  it('reconnaît l’hôte local avec port', () => {
    expect(isErpHost('erp.localhost:3000')).toBe(true)
  })

  it('est insensible à la casse', () => {
    expect(isErpHost('ERP.Pieces.CI')).toBe(true)
  })

  it('refuse les autres hôtes du domaine', () => {
    expect(isErpHost('pieces.ci')).toBe(false)
    expect(isErpHost('flotte.pieces.ci')).toBe(false)
    expect(isErpHost('logistique.pieces.ci')).toBe(false)
  })

  it('refuse un hôte qui contient « erp » sans être le sous-domaine', () => {
    expect(isErpHost('superp.pieces.ci')).toBe(false)
    expect(isErpHost('pieces.ci/erp')).toBe(false)
  })

  it('tolère l’absence d’en-tête host', () => {
    expect(isErpHost(null)).toBe(false)
    expect(isErpHost(undefined)).toBe(false)
    expect(isErpHost('')).toBe(false)
  })
})

describe('isErpPassthrough', () => {
  it('laisse passer les chemins d’authentification', () => {
    // Sans ça, impossible de se connecter depuis erp.pieces.ci.
    expect(isErpPassthrough('/login')).toBe(true)
    expect(isErpPassthrough('/auth/callback')).toBe(true)
    expect(isErpPassthrough('/reset-password')).toBe(true)
  })

  it('laisse passer les pages légales', () => {
    expect(isErpPassthrough('/cgu')).toBe(true)
    expect(isErpPassthrough('/confidentialite')).toBe(true)
  })

  it('ne laisse pas passer les écrans ERP', () => {
    expect(isErpPassthrough('/')).toBe(false)
    expect(isErpPassthrough('/taches')).toBe(false)
    expect(isErpPassthrough('/ventes/factures')).toBe(false)
  })

  it('ne se laisse pas berner par un préfixe partiel', () => {
    expect(isErpPassthrough('/logins')).toBe(false)
    expect(isErpPassthrough('/cguide')).toBe(false)
  })
})

describe('toErpInternalPath', () => {
  it('mappe la racine sur le cockpit', () => {
    expect(toErpInternalPath('/')).toBe('/erp')
  })

  it('préfixe les chemins du sous-domaine', () => {
    expect(toErpInternalPath('/taches')).toBe('/erp/taches')
    expect(toErpInternalPath('/crm/pipeline')).toBe('/erp/crm/pipeline')
    expect(toErpInternalPath('/parametres/equipe')).toBe('/erp/parametres/equipe')
  })

  it('est idempotent — pieces.ci/erp/x et erp.pieces.ci/x aboutissent au même endroit', () => {
    expect(toErpInternalPath('/erp')).toBe('/erp')
    expect(toErpInternalPath('/erp/taches')).toBe('/erp/taches')
    expect(toErpInternalPath(toErpInternalPath('/taches'))).toBe('/erp/taches')
  })

  it('ne confond pas un chemin qui commence par les mêmes lettres', () => {
    expect(toErpInternalPath('/erpx')).toBe('/erp/erpx')
  })
})

describe('isErpSurface', () => {
  it('reconnaît le cockpit et ses sous-pages', () => {
    expect(isErpSurface('/erp')).toBe(true)
    expect(isErpSurface('/erp/taches')).toBe(true)
  })

  it('exclut le reste de l’application', () => {
    expect(isErpSurface('/')).toBe(false)
    expect(isErpSurface('/admin')).toBe(false)
    expect(isErpSurface('/erpx')).toBe(false)
  })
})

describe('cohabitation avec les autres sous-domaines', () => {
  it('n’intercepte pas les hôtes logistique et flotte', () => {
    expect(isErpHost('logistique.pieces.ci')).toBe(false)
    expect(isLogistiqueHost('erp.pieces.ci')).toBe(false)
  })

  it('laisse la vitrine logistique répondre sur ses propres slugs', () => {
    // Non-régression : les deux tables de routage sont disjointes.
    expect(isLogistiqueSlug('/devis')).toBe(true)
    expect(isErpPassthrough('/devis')).toBe(false)
  })

  it('ne réutilise aucun préfixe déjà pris par un espace existant', () => {
    for (const p of ERP_PASSTHROUGH) {
      expect(isErpSurface(p)).toBe(false)
    }
    expect(ERP_PREFIX).toBe('/erp')
  })
})

describe('intégration avec les espaces', () => {
  it('rattache /erp à l’espace ERP', () => {
    expect(spaceForPath('/erp')?.key).toBe('erp')
    expect(spaceForPath('/erp/taches')?.key).toBe('erp')
  })

  it('n’altère pas le rattachement de /admin', () => {
    expect(spaceForPath('/admin')?.key).toBe('admin')
    expect(spaceForPath('/admin/prospection')?.key).toBe('admin')
  })

  it('propose l’ERP aux administrateurs, et à eux seuls', () => {
    const adminSpaces = spacesForRoles(['ADMIN']).map((s) => s.key)
    expect(adminSpaces).toContain('erp')
    expect(spacesForRoles(['BUYER']).map((s) => s.key)).not.toContain('erp')
    expect(spacesForRoles(['SELLER', 'RIDER']).map((s) => s.key)).not.toContain('erp')
  })

  it('reste un espace réservé — jamais auto-activable', () => {
    const erp = spacesForRoles(['ADMIN']).find((s) => s.key === 'erp')
    expect(erp?.activation).toBeUndefined()
    expect(erp?.reserved).toBeTruthy()
  })
})
