import { describe, it, expect } from 'vitest'
import { isErpHost, isErpPassthrough, toErpInternalPath, ERP_PREFIX } from './erp-routes'

describe('isErpHost', () => {
  it('reconnaît le sous-domaine, avec ou sans port', () => {
    expect(isErpHost('erp.pieces.ci')).toBe(true)
    expect(isErpHost('erp.pieces.ci:3000')).toBe(true)
    expect(isErpHost('ERP.pieces.ci')).toBe(true)
  })

  it('ignore les autres hôtes', () => {
    expect(isErpHost('pieces.ci')).toBe(false)
    expect(isErpHost('flotte.pieces.ci')).toBe(false)
    expect(isErpHost('logistique.pieces.ci')).toBe(false)
    // Piège : un hôte qui contient « erp » sans en être le sous-domaine.
    expect(isErpHost('enterprise.pieces.ci')).toBe(false)
    expect(isErpHost(null)).toBe(false)
    expect(isErpHost(undefined)).toBe(false)
  })
})

describe('isErpPassthrough', () => {
  it('laisse passer l’authentification et les pages légales', () => {
    expect(isErpPassthrough('/login')).toBe(true)
    expect(isErpPassthrough('/auth/callback')).toBe(true)
    expect(isErpPassthrough('/cgu')).toBe(true)
  })

  it('laisse passer les modules /admin encore en place', () => {
    expect(isErpPassthrough('/admin')).toBe(true)
    expect(isErpPassthrough('/admin/prospection')).toBe(true)
    expect(isErpPassthrough('/admin/stock/achats')).toBe(true)
  })

  it('ne laisse pas passer le reste', () => {
    expect(isErpPassthrough('/parametres/equipe')).toBe(false)
    expect(isErpPassthrough('/dashboard')).toBe(false)
    // Piège : un préfixe qui n'est pas une frontière de segment.
    expect(isErpPassthrough('/administration')).toBe(false)
    expect(isErpPassthrough('/logins')).toBe(false)
  })
})

describe('toErpInternalPath', () => {
  it('préfixe la racine et les chemins simples', () => {
    expect(toErpInternalPath('/')).toBe(ERP_PREFIX)
    expect(toErpInternalPath('/parametres/equipe')).toBe('/erp/parametres/equipe')
  })

  it('est idempotent — un chemin déjà préfixé n’est pas préfixé deux fois', () => {
    expect(toErpInternalPath('/erp')).toBe('/erp')
    expect(toErpInternalPath('/erp/parametres/equipe')).toBe('/erp/parametres/equipe')
    expect(toErpInternalPath(toErpInternalPath('/ventes/commandes'))).toBe('/erp/ventes/commandes')
  })

  it('ne confond pas un chemin qui commence par les mêmes lettres', () => {
    expect(toErpInternalPath('/erpx')).toBe('/erp/erpx')
  })
})
