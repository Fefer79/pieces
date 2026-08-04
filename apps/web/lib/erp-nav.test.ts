import { describe, it, expect } from 'vitest'
import { ERP_NAV, navForCapabilities, activeNavHref } from './erp-nav'
import {
  ERP_CAPABILITIES,
  ERP_CAPABILITIES_LIST,
  ERP_BADGE_KEYS,
  capabilitiesFor,
  STAFF_ROLES,
} from 'shared/constants'
import { isErpPassthrough } from './erp-routes'

describe('structure de la navigation', () => {
  it('compte neuf sections, toutes non vides', () => {
    expect(ERP_NAV).toHaveLength(9)
    for (const section of ERP_NAV) {
      expect(section.items.length).toBeGreaterThan(0)
    }
  })

  it('n’a ni clé de section ni href en double', () => {
    const keys = ERP_NAV.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)

    const hrefs = ERP_NAV.flatMap((s) => s.items.map((i) => i.href))
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('ne référence que des capacités connues', () => {
    for (const section of ERP_NAV) {
      for (const item of section.items) {
        expect(ERP_CAPABILITIES_LIST).toContain(item.capability)
      }
    }
  })

  it('ne référence que des compteurs connus', () => {
    for (const section of ERP_NAV) {
      for (const item of section.items) {
        if (item.badge) expect(ERP_BADGE_KEYS).toContain(item.badge)
      }
    }
  })

  it('n’attache jamais de compteur à un écran pas encore livré', () => {
    for (const section of ERP_NAV) {
      for (const item of section.items) {
        if (item.soon) expect(item.badge).toBeUndefined()
      }
    }
  })

  it('annonce le lot de chaque écran encore à construire', () => {
    for (const section of ERP_NAV) {
      for (const item of section.items) {
        if (item.soon) expect(item.lot).toBeTruthy()
      }
    }
  })

  /**
   * Le piège du lot 1 : sur erp.pieces.ci tout est réécrit vers /erp/*. Une
   * entrée qui pointe vers un module existant doit donc être en passe-droit,
   * sinon le clic mène à /erp/admin/... → 404.
   */
  it('ne pointe que vers /erp/* ou vers un chemin en passe-droit', () => {
    for (const section of ERP_NAV) {
      for (const item of section.items) {
        const ok = item.href === '/erp' || item.href.startsWith('/erp/') || isErpPassthrough(item.href)
        expect(ok, `${item.label} → ${item.href}`).toBe(true)
      }
    }
  })

  it('ne renvoie vers un écran existant que s’il n’est pas marqué « bientôt »', () => {
    for (const section of ERP_NAV) {
      for (const item of section.items) {
        if (item.href.startsWith('/admin')) expect(item.soon).toBeFalsy()
      }
    }
  })
})

describe('navForCapabilities', () => {
  it('ne rend rien sans capacité', () => {
    expect(navForCapabilities([])).toEqual([])
  })

  it('rend les neuf sections à la direction', () => {
    const caps = capabilitiesFor({ staffRole: 'DIRECTION', active: true })
    expect(navForCapabilities(caps)).toHaveLength(9)
  })

  it('supprime les sections vidées plutôt que d’afficher un titre orphelin', () => {
    const caps = capabilitiesFor({ staffRole: 'MAGASINIER', active: true })
    const sections = navForCapabilities(caps)
    for (const section of sections) expect(section.items.length).toBeGreaterThan(0)
    expect(sections.map((s) => s.key)).not.toContain('comptabilite')
  })

  it('ne montre les neuf sections qu’à la direction', () => {
    for (const role of STAFF_ROLES) {
      const count = navForCapabilities(capabilitiesFor({ staffRole: role, active: true })).length
      if (role === 'DIRECTION') {
        expect(count).toBe(9)
      } else {
        // Personne d'autre n'a la carte complète : c'est ce qui rend une
        // console à neuf sections praticable. Bornes constatées : 5 (support)
        // à 8 (ops logistique).
        expect(count, role).toBeLessThan(9)
        expect(count, role).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('garde la comptabilité hors de portée du commerce et du magasin', () => {
    for (const role of ['COMMERCIAL', 'MAGASINIER'] as const) {
      const caps = capabilitiesFor({ staffRole: role, active: true })
      expect(navForCapabilities(caps).map((s) => s.key)).not.toContain('comptabilite')
    }
  })

  it('n’ouvre les paramètres d’équipe qu’à ceux qui ont erp:read, et l’audit à la direction', () => {
    const support = navForCapabilities(capabilitiesFor({ staffRole: 'SUPPORT', active: true }))
    const parametres = support.find((s) => s.key === 'parametres')
    expect(parametres?.items.map((i) => i.label)).toEqual(['Équipe'])
  })

  it('cache tout à un membre désactivé', () => {
    expect(navForCapabilities(capabilitiesFor({ staffRole: 'DIRECTION', active: false }))).toEqual([])
  })

  it('n’expose « Projections » qu’à la direction', () => {
    for (const role of STAFF_ROLES) {
      const caps = capabilitiesFor({ staffRole: role, active: true })
      const labels = navForCapabilities(caps).flatMap((s) => s.items.map((i) => i.label))
      expect(labels.includes('Projections'), role).toBe(
        ERP_CAPABILITIES[role].includes('erp:admin'),
      )
    }
  })
})

describe('activeNavHref', () => {
  it('choisit la correspondance la plus longue', () => {
    expect(activeNavHref('/admin/stock/achats')).toBe('/admin/stock/achats')
    expect(activeNavHref('/admin/stock/mouvements')).toBe('/admin/stock/mouvements')
    expect(activeNavHref('/admin/stock')).toBe('/admin/stock')
  })

  it('reste sur l’entrée parente pour une fiche', () => {
    expect(activeNavHref('/admin/sourcing/abc123')).toBe('/admin/sourcing')
  })

  it('n’active pas le cockpit depuis une autre page ERP', () => {
    expect(activeNavHref('/erp/parametres/equipe')).toBe('/erp/parametres/equipe')
    expect(activeNavHref('/erp')).toBe('/erp')
  })

  it('rend null hors navigation', () => {
    expect(activeNavHref('/dashboard')).toBeNull()
  })
})
