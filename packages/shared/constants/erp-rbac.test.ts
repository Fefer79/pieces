import { describe, it, expect } from 'vitest'
import {
  STAFF_ROLES,
  STAFF_ROLE_LABELS,
  BUSINESS_UNITS,
  BUSINESS_UNIT_LABELS,
  ERP_CAPABILITIES,
  ERP_CAPABILITIES_LIST,
  ERP_CAPABILITY_LABELS,
  capabilitiesFor,
  hasCapability,
  hasAnyCapability,
} from './erp-rbac'

describe('erp-rbac — intégrité de la matrice', () => {
  it('couvre tous les rôles métier', () => {
    for (const role of STAFF_ROLES) {
      expect(ERP_CAPABILITIES[role], `rôle sans capacités : ${role}`).toBeDefined()
      expect(STAFF_ROLE_LABELS[role]).toBeTruthy()
    }
    expect(Object.keys(ERP_CAPABILITIES).sort()).toEqual([...STAFF_ROLES].sort())
  })

  it('n’accorde aucune capacité inconnue', () => {
    for (const role of STAFF_ROLES) {
      for (const cap of ERP_CAPABILITIES[role]) {
        expect(ERP_CAPABILITIES_LIST, `capacité orpheline sur ${role} : ${cap}`).toContain(cap)
      }
    }
  })

  it('libelle chaque capacité et chaque ligne d’activité', () => {
    for (const cap of ERP_CAPABILITIES_LIST) {
      expect(ERP_CAPABILITY_LABELS[cap], `libellé manquant : ${cap}`).toBeTruthy()
    }
    for (const bu of BUSINESS_UNITS) {
      expect(BUSINESS_UNIT_LABELS[bu]).toBeTruthy()
    }
  })

  it('donne le socle erp:read à tous les rôles', () => {
    for (const role of STAFF_ROLES) {
      expect(ERP_CAPABILITIES[role], role).toContain('erp:read')
    }
  })

  it('réserve erp:admin à la direction', () => {
    const withAdmin = STAFF_ROLES.filter((r) => ERP_CAPABILITIES[r].includes('erp:admin'))
    expect(withAdmin).toEqual(['DIRECTION'])
  })

  it('sépare la commande de son approbation', () => {
    expect(ERP_CAPABILITIES.ACHETEUR).toContain('purchase:order')
    expect(ERP_CAPABILITIES.ACHETEUR).not.toContain('purchase:approve')
  })

  it('n’autorise la clôture de période qu’à la compta et à la direction', () => {
    const canClose = STAFF_ROLES.filter((r) => ERP_CAPABILITIES[r].includes('accounting:close'))
    expect(canClose.sort()).toEqual(['COMPTABLE', 'DIRECTION'])
  })

  it('ne donne aucun droit d’écriture au support', () => {
    const writes = ERP_CAPABILITIES.SUPPORT.filter((c) => !c.endsWith(':read'))
    expect(writes).toEqual([])
  })
})

describe('capabilitiesFor', () => {
  it('donne toutes les capacités à un ADMIN plateforme (amorçage)', () => {
    const caps = capabilitiesFor({ isPlatformAdmin: true })
    expect(caps.sort()).toEqual([...ERP_CAPABILITIES_LIST].sort())
  })

  it('donne toutes les capacités à un ADMIN plateforme même sans fiche staff', () => {
    expect(capabilitiesFor({ staffRole: null, isPlatformAdmin: true })).toContain('accounting:post')
  })

  it('ne donne rien sans fiche staff ni rôle ADMIN', () => {
    expect(capabilitiesFor({ staffRole: null })).toEqual([])
    expect(capabilitiesFor({})).toEqual([])
  })

  it('ne donne rien à un membre désactivé', () => {
    expect(capabilitiesFor({ staffRole: 'COMPTABLE', active: false })).toEqual([])
  })

  it('renvoie les capacités du rôle pour un membre actif', () => {
    const caps = capabilitiesFor({ staffRole: 'COMMERCIAL', active: true })
    expect(caps).toContain('crm:write')
    expect(caps).not.toContain('accounting:post')
  })

  it('renvoie une copie — la matrice n’est pas mutable depuis l’appelant', () => {
    const caps = capabilitiesFor({ staffRole: 'SUPPORT', active: true })
    caps.push('erp:admin')
    expect(ERP_CAPABILITIES.SUPPORT).not.toContain('erp:admin')
  })
})

describe('hasCapability / hasAnyCapability', () => {
  it('reconnaît une capacité présente', () => {
    expect(hasCapability(['erp:read', 'crm:read'], 'crm:read')).toBe(true)
  })

  it('refuse une capacité absente', () => {
    expect(hasCapability(['erp:read'], 'accounting:post')).toBe(false)
  })

  it('fait de erp:admin un passe-partout', () => {
    expect(hasCapability(['erp:admin'], 'accounting:close')).toBe(true)
    expect(hasCapability(['erp:admin'], 'stock:adjust')).toBe(true)
  })

  it('accepte si l’une des capacités demandées est couverte', () => {
    expect(hasAnyCapability(['stock:read'], ['stock:move', 'stock:read'])).toBe(true)
    expect(hasAnyCapability(['stock:read'], ['stock:move', 'stock:adjust'])).toBe(false)
  })

  it('n’exige rien quand la liste demandée est vide', () => {
    expect(hasAnyCapability([], [])).toBe(true)
  })
})
