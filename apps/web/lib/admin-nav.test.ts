import { describe, it, expect } from 'vitest'
import { ADMIN_NAV, navForCapabilities, activeNavHref } from './admin-nav'
import { capabilitiesFor, ERP_CAPABILITIES_LIST } from 'shared/constants'

const ALL = [...ERP_CAPABILITIES_LIST]

describe('ADMIN_NAV', () => {
  it('ne déclare aucun href en double', () => {
    const hrefs = ADMIN_NAV.flatMap((s) => s.items.map((i) => i.href))
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('couvre les 19 écrans du back-office', () => {
    expect(ADMIN_NAV.flatMap((s) => s.items)).toHaveLength(19)
  })

  it('n’a pas de section vide', () => {
    for (const section of ADMIN_NAV) expect(section.items.length).toBeGreaterThan(0)
  })
})

describe('navForCapabilities', () => {
  it('montre tout à un ADMIN plateforme', () => {
    const nav = navForCapabilities(ALL, { isPlatformAdmin: true })
    expect(nav.flatMap((s) => s.items)).toHaveLength(19)
  })

  it('masque les écrans encore gardés par Role.ADMIN à un membre non-ADMIN', () => {
    const hrefs = navForCapabilities(ALL).flatMap((s) => s.items.map((i) => i.href))
    // Modules à garde mixte (LIAISON/SELLER/ADMIN) non convertis aux capacités.
    expect(hrefs).not.toContain('/admin/vendors')
    expect(hrefs).not.toContain('/admin/liaisons')
    // Le reste, converti, reste visible.
    expect(hrefs).toContain('/admin/stock')
    expect(hrefs).toContain('/admin/prospection')
  })

  it('ne montre rien à qui n’a aucune capacité', () => {
    expect(navForCapabilities([])).toEqual([])
  })

  it('supprime les sections vidées plutôt que d’afficher un titre orphelin', () => {
    const nav = navForCapabilities(['accounting:read'])
    expect(nav.map((s) => s.key)).toEqual(['finance'])
  })

  it('un comptable voit la finance et les achats, pas le stock', () => {
    const nav = navForCapabilities(capabilitiesFor({ staffRole: 'COMPTABLE', active: true }))
    const hrefs = nav.flatMap((s) => s.items.map((i) => i.href))
    expect(hrefs).toContain('/admin/finance')
    expect(hrefs).toContain('/admin/crm')
    // `purchase:read` fait partie de son rôle : il consulte les achats.
    expect(hrefs).toContain('/admin/sourcing')
    // `stock:read` non : les niveaux de stock ne le regardent pas.
    expect(hrefs).not.toContain('/admin/stock')
    // Réservé à `erp:admin` : ni l'équipe ni la modélisation.
    expect(hrefs).not.toContain('/admin/equipe')
  })

  it('un magasinier voit le stock, pas le CRM ni la finance', () => {
    const nav = navForCapabilities(capabilitiesFor({ staffRole: 'MAGASINIER', active: true }))
    const hrefs = nav.flatMap((s) => s.items.map((i) => i.href))
    expect(hrefs).toContain('/admin/stock')
    expect(hrefs).toContain('/admin/sourcing')
    expect(hrefs).not.toContain('/admin/crm')
    expect(hrefs).not.toContain('/admin/finance')
  })

  it('un membre désactivé ne voit rien', () => {
    const nav = navForCapabilities(capabilitiesFor({ staffRole: 'DIRECTION', active: false }))
    expect(nav).toEqual([])
  })

  it('un ADMIN plateforme sans fiche d’équipe voit tout', () => {
    const nav = navForCapabilities(capabilitiesFor({ isPlatformAdmin: true }), {
      isPlatformAdmin: true,
    })
    expect(nav.flatMap((s) => s.items)).toHaveLength(19)
  })
})

describe('activeNavHref', () => {
  it('préfère la correspondance la plus longue', () => {
    expect(activeNavHref('/admin/stock')).toBe('/admin/stock')
    expect(activeNavHref('/admin/expeditions/abc')).toBe('/admin/expeditions')
  })

  it('n’active /admin que sur la racine', () => {
    expect(activeNavHref('/admin')).toBe('/admin')
    expect(activeNavHref('/admin/crm')).toBe('/admin/crm')
  })

  it('renvoie null hors du back-office', () => {
    expect(activeNavHref('/dashboard')).toBeNull()
  })
})
