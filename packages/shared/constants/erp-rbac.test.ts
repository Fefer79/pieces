import { describe, it, expect } from 'vitest'
import {
  STAFF_ROLES,
  ERP_CAPABILITIES,
  ERP_CAPABILITIES_LIST,
  ERP_CAPABILITY_LABELS,
  STAFF_ROLE_LABELS,
  STAFF_ROLE_HINTS,
  capabilitiesFor,
  hasCapability,
  hasAnyCapability,
  isStaffRole,
  isBusinessUnit,
} from './erp-rbac'

describe('matrice de capacités', () => {
  it('donne un libellé à chaque capacité et à chaque rôle', () => {
    for (const c of ERP_CAPABILITIES_LIST) expect(ERP_CAPABILITY_LABELS[c]).toBeTruthy()
    for (const r of STAFF_ROLES) {
      expect(STAFF_ROLE_LABELS[r]).toBeTruthy()
      expect(STAFF_ROLE_HINTS[r]).toBeTruthy()
    }
  })

  it('accorde erp:read à tous les rôles — sans elle, aucun accès', () => {
    for (const role of STAFF_ROLES) {
      expect(ERP_CAPABILITIES[role]).toContain('erp:read')
    }
  })

  it('n’accorde erp:admin qu’à la direction', () => {
    const admins = STAFF_ROLES.filter((r) => ERP_CAPABILITIES[r].includes('erp:admin'))
    expect(admins).toEqual(['DIRECTION'])
  })

  it('ne référence que des capacités connues', () => {
    for (const role of STAFF_ROLES) {
      for (const c of ERP_CAPABILITIES[role]) {
        expect(ERP_CAPABILITIES_LIST).toContain(c)
      }
    }
  })

  it('sépare la commande de l’approbation : l’acheteur ne s’approuve pas lui-même', () => {
    expect(ERP_CAPABILITIES.ACHETEUR).toContain('purchase:order')
    expect(ERP_CAPABILITIES.ACHETEUR).not.toContain('purchase:approve')
  })

  it('garde la clôture comptable hors du magasin et du commerce', () => {
    expect(ERP_CAPABILITIES.MAGASINIER).not.toContain('accounting:close')
    expect(ERP_CAPABILITIES.COMMERCIAL).not.toContain('accounting:read')
  })

  it('laisse le support en lecture seule', () => {
    for (const c of ERP_CAPABILITIES.SUPPORT) {
      expect(c.endsWith(':read')).toBe(true)
    }
  })
})

describe('capabilitiesFor', () => {
  it('donne tout à un ADMIN plateforme, même sans fiche staff', () => {
    const caps = capabilitiesFor({ isPlatformAdmin: true })
    expect(caps).toEqual([...ERP_CAPABILITIES_LIST])
  })

  it('donne tout à un ADMIN plateforme même désactivé côté staff', () => {
    // L'amorçage prime : sinon un administrateur pourrait se verrouiller dehors.
    expect(capabilitiesFor({ isPlatformAdmin: true, staffRole: 'SUPPORT', active: false })).toEqual([
      ...ERP_CAPABILITIES_LIST,
    ])
  })

  it('ne donne rien sans fiche staff ni rôle plateforme', () => {
    expect(capabilitiesFor({})).toEqual([])
    expect(capabilitiesFor({ staffRole: null, active: true })).toEqual([])
  })

  it('ne donne rien à un membre désactivé', () => {
    expect(capabilitiesFor({ staffRole: 'DIRECTION', active: false })).toEqual([])
  })

  it('rend les capacités du rôle pour un membre actif', () => {
    expect(capabilitiesFor({ staffRole: 'MAGASINIER', active: true })).toEqual([
      ...ERP_CAPABILITIES.MAGASINIER,
    ])
  })
})

describe('hasCapability', () => {
  it('erp:admin couvre toutes les capacités', () => {
    expect(hasCapability(['erp:admin'], 'accounting:close')).toBe(true)
    expect(hasCapability(['erp:admin'], 'stock:adjust')).toBe(true)
  })

  it('refuse ce qui n’est pas accordé', () => {
    expect(hasCapability(['erp:read', 'crm:read'], 'crm:write')).toBe(false)
  })

  it('hasAnyCapability : liste vide = autorisé', () => {
    expect(hasAnyCapability([], [])).toBe(true)
    expect(hasAnyCapability(['crm:read'], ['crm:write', 'crm:read'])).toBe(true)
    expect(hasAnyCapability(['crm:read'], ['accounting:post'])).toBe(false)
  })
})

describe('gardes de type', () => {
  it('reconnaît les rôles et lignes valides', () => {
    expect(isStaffRole('COMPTABLE')).toBe(true)
    expect(isStaffRole('PLOMBIER')).toBe(false)
    expect(isBusinessUnit('FLOTTE')).toBe(true)
    expect(isBusinessUnit('AUTRE')).toBe(false)
  })
})
