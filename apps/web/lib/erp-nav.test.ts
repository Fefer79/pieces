import { describe, it, expect } from 'vitest'
import { ERP_NAV, navForCapabilities, activeNavHref } from './erp-nav'
import { capabilitiesFor, ERP_CAPABILITIES_LIST } from 'shared/constants'

describe('ERP_NAV — intégrité', () => {
  it('n’exige que des capacités connues', () => {
    for (const section of ERP_NAV) {
      for (const item of section.items) {
        expect(ERP_CAPABILITIES_LIST, `${item.href} → ${item.capability}`).toContain(
          item.capability,
        )
      }
    }
  })

  it('n’a aucun href en double', () => {
    const hrefs = ERP_NAV.flatMap((s) => s.items.map((i) => i.href))
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('n’a aucune clé de section en double', () => {
    const keys = ERP_NAV.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('libelle chaque entrée en français', () => {
    for (const section of ERP_NAV) {
      expect(section.label).toBeTruthy()
      for (const item of section.items) {
        expect(item.label).toBeTruthy()
        // Vocabulaire produit : on ne dit jamais « rôle » ni « permission ».
        expect(item.label.toLowerCase()).not.toContain('rôle')
        expect(item.label.toLowerCase()).not.toContain('permission')
      }
    }
  })

  it('ne marque « à venir » que ce qui n’est pas livré en phase 1', () => {
    const live = ERP_NAV.flatMap((s) => s.items)
      .filter((i) => !i.soon)
      .map((i) => i.href)
      .sort()
    expect(live).toEqual([
      '/admin/logistique',
      '/admin/prospection',
      '/erp',
      '/erp/parametres/equipe',
      '/erp/taches',
    ])
  })
})

describe('navForCapabilities', () => {
  it('donne toute la navigation à la direction', () => {
    const nav = navForCapabilities(capabilitiesFor({ staffRole: 'DIRECTION', active: true }))
    expect(nav.map((s) => s.key)).toEqual(ERP_NAV.map((s) => s.key))
  })

  it('donne toute la navigation à un ADMIN plateforme', () => {
    const nav = navForCapabilities(capabilitiesFor({ isPlatformAdmin: true }))
    expect(nav.map((s) => s.key)).toEqual(ERP_NAV.map((s) => s.key))
  })

  it('masque les achats au comptable', () => {
    // Le comptable a purchase:read (il voit les factures fournisseurs) mais
    // aucune entrée stock.
    const nav = navForCapabilities(capabilitiesFor({ staffRole: 'COMPTABLE', active: true }))
    expect(nav.map((s) => s.key)).not.toContain('stock')
    expect(nav.map((s) => s.key)).toContain('comptabilite')
  })

  it('masque la comptabilité au commercial', () => {
    const nav = navForCapabilities(capabilitiesFor({ staffRole: 'COMMERCIAL', active: true }))
    const keys = nav.map((s) => s.key)
    expect(keys).toContain('crm')
    expect(keys).not.toContain('comptabilite')
    expect(keys).not.toContain('achats')
  })

  it('réduit le magasinier au stock et au pilotage', () => {
    const nav = navForCapabilities(capabilitiesFor({ staffRole: 'MAGASINIER', active: true }))
    expect(nav.map((s) => s.key).sort()).toEqual(['achats', 'parametres', 'pilotage', 'stock'])
  })

  it('ne laisse aucune section vide', () => {
    for (const role of ['COMMERCIAL', 'COMPTABLE', 'ACHETEUR', 'MAGASINIER', 'SUPPORT'] as const) {
      const nav = navForCapabilities(capabilitiesFor({ staffRole: role, active: true }))
      for (const section of nav) {
        expect(section.items.length, `${role} / ${section.key}`).toBeGreaterThan(0)
      }
    }
  })

  it('ne renvoie rien sans capacité', () => {
    expect(navForCapabilities([])).toEqual([])
  })

  it('laisse le cockpit et les tâches à tout membre actif', () => {
    for (const role of ['COMMERCIAL', 'COMPTABLE', 'ACHETEUR', 'MAGASINIER', 'SUPPORT'] as const) {
      const hrefs = navForCapabilities(capabilitiesFor({ staffRole: role, active: true })).flatMap(
        (s) => s.items.map((i) => i.href),
      )
      expect(hrefs, role).toContain('/erp')
      expect(hrefs, role).toContain('/erp/taches')
    }
  })
})

describe('activeNavHref', () => {
  it('choisit la correspondance la plus longue', () => {
    // Sans le tri par longueur, /erp resterait actif sur /erp/taches.
    expect(activeNavHref('/erp/taches')).toBe('/erp/taches')
    expect(activeNavHref('/erp')).toBe('/erp')
  })

  it('reste actif sur une sous-page', () => {
    expect(activeNavHref('/erp/parametres/equipe')).toBe('/erp/parametres/equipe')
  })

  it('reconnaît les liens croisés vers l’admin', () => {
    expect(activeNavHref('/admin/prospection')).toBe('/admin/prospection')
  })

  it('ne renvoie rien hors navigation', () => {
    expect(activeNavHref('/dashboard')).toBeNull()
    expect(activeNavHref('/erpx')).toBeNull()
  })
})
