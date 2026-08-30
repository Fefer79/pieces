import { describe, it, expect } from 'vitest'
import { computeArbitrageMatrix, matchLogisticsFamily } from 'shared/constants'
import {
  DEMO_MATRIX,
  DEMO_MATRIX_PART_QUERY,
  PUBLIC_MODES,
  MODE_COPY,
  LOGISTIQUE_NAV,
  canonicalFor,
  LOGISTIQUE_FAQ,
  LOGISTIQUE_HERO,
  LOGISTIQUE_RECEIPT_OPEN,
  LOGISTIQUE_STATS,
  LOGISTIQUE_SEGMENTS,
  LOGISTIQUE_SEGMENTS_INTRO,
  VTC_TEASER,
  CUSTOMER_TYPE_OPTIONS,
  customerTypeLabel,
  isCustomerType,
} from './logistique-content'
import { isLogistiqueHost, isLogistiqueSlug, toLogistiqueInternalPath } from './logistique-routes'

describe('DEMO_MATRIX — la table de la landing sort du moteur produit', () => {
  const result = computeArbitrageMatrix({
    ...DEMO_MATRIX.input,
    family: matchLogisticsFamily(DEMO_MATRIX_PART_QUERY),
  })

  it('résout la famille amortisseur', () => {
    expect(result.familyId).toBe('SHOCK_ABSORBER')
  })

  it('classe le maritime en dernier malgré le fret le moins cher', () => {
    const last = result.options[result.options.length - 1]!
    expect(last.mode).toBe('SEA_LCL')
    const freights = result.options.map((o) => o.freightCost)
    expect(last.freightCost).toBe(Math.min(...freights))
  })

  it('démontre qu’à prix de pièce égal, le mode d’acheminement fait tout', () => {
    // La démonstration ne repose plus sur un prix local plus élevé : toutes les
    // options partent du même prix usine, seul l'acheminement les sépare.
    const sea = result.options.find((o) => o.mode === 'SEA_LCL')!
    const best = result.options.find((o) => o.recommended)!
    expect(new Set(result.options.map((o) => o.partPrice)).size).toBe(1)
    expect(sea.totalCost).toBeGreaterThan(best.totalCost * 2)
  })

  it('ne propose plus l’achat local : la cotation sert quand la pièce manque', () => {
    expect(result.options.some((o) => o.mode === 'LOCAL')).toBe(false)
  })

  it('signale la restriction aérienne des amortisseurs à gaz', () => {
    const air = result.options.find((o) => o.mode === 'AIR_NOW')!
    expect(air.warnings.join(' ')).toMatch(/aérien/i)
  })
})

describe('modes publics', () => {
  it('n\'expose jamais le stock pré-positionné au public', () => {
    expect(PUBLIC_MODES).not.toContain('PRE_POSITIONED')
  })

  it('donne une copy publique à chaque mode du moteur', () => {
    for (const mode of PUBLIC_MODES) {
      expect(MODE_COPY[mode]?.publicLabel).toBeTruthy()
    }
  })
})

describe('copy — contraintes éditoriales', () => {
  const allText = [
    ...LOGISTIQUE_FAQ.flatMap((f) => [f.q, f.a]),
    ...LOGISTIQUE_NAV.map((n) => n.label),
    LOGISTIQUE_HERO.title,
    LOGISTIQUE_HERO.lead,
    LOGISTIQUE_SEGMENTS_INTRO,
    ...LOGISTIQUE_SEGMENTS.flatMap((s) => [s.title, s.body]),
    VTC_TEASER.title,
    VTC_TEASER.lead,
    ...VTC_TEASER.bullets,
  ].join(' ')

  it('n\'emploie aucun vocabulaire de SLA, pénalité ou garantie de délai', () => {
    expect(allText).not.toMatch(/\bSLA\b|pénalit|garantissons|délai garanti|remboursement/i)
  })

  it('ne nomme jamais le partenaire transitaire', () => {
    expect(allText).not.toMatch(/transitaire\s+\p{Lu}/u)
  })
})

describe('vitrine ouverte — la home ne présuppose plus une flotte', () => {
  it('ne porte pas le coût d\'immobilisation dans son argument d\'entrée', () => {
    const hero = `${LOGISTIQUE_HERO.title} ${LOGISTIQUE_HERO.lead}`
    expect(hero).not.toMatch(/immobilisation|recette perdue/i)
  })

  it('annonce les segments non-flotte dans le hero', () => {
    expect(LOGISTIQUE_HERO.audiences).toContain('Particuliers')
    expect(LOGISTIQUE_HERO.audiences).toContain('Garages & ateliers')
    expect(LOGISTIQUE_HERO.audiences).toContain('Concessionnaires')
  })

  it('garde le reçu d\'accueil libre d\'immobilisation, et son total juste', () => {
    const labels = LOGISTIQUE_RECEIPT_OPEN.lines.map((l) => l.label).join(' ')
    expect(labels).not.toMatch(/immobilisation/i)
    const sum = LOGISTIQUE_RECEIPT_OPEN.lines.reduce(
      (acc, l) => acc + Number(l.value.replace(/\D/g, '')),
      0,
    )
    expect(LOGISTIQUE_RECEIPT_OPEN.total.value.replace(/\D/g, '')).toBe(String(sum))
  })

  it('n\'affiche plus de stat propre aux flottes dans la bande d\'accueil', () => {
    const stats = LOGISTIQUE_STATS.map((s) => `${s.num} ${s.cap}`).join(' ')
    expect(stats).not.toMatch(/arrêt|immobilisation/i)
  })

  it('renvoie vers la page flottes VTC depuis la section prioritaire', () => {
    expect(VTC_TEASER.ctaPrimary.href).toBe('/logistique/flottes-vtc')
    expect(LOGISTIQUE_NAV.some((n) => n.href === '/logistique/flottes-vtc')).toBe(true)
  })
})

describe('segments — pré-remplissage du formulaire', () => {
  it('n\'expose que des types de demandeur connus de l\'API', () => {
    for (const segment of LOGISTIQUE_SEGMENTS) {
      expect(isCustomerType(segment.profil)).toBe(true)
    }
  })

  it('rejette un profil inconnu venu de l\'URL', () => {
    expect(isCustomerType('FLEET_VTC')).toBe(true)
    expect(isCustomerType('PIRATE')).toBe(false)
    expect(isCustomerType(null)).toBe(false)
    expect(isCustomerType('')).toBe(false)
  })

  it('dit « concessionnaire », pas « concession »', () => {
    expect(customerTypeLabel('DEALER')).toBe('Concessionnaire')
    expect(CUSTOMER_TYPE_OPTIONS.map((o) => o.label).join(' ')).not.toMatch(/\bConcession\b/)
  })
})

describe('canonicalFor', () => {
  it('ne double pas le slash pour la racine', () => {
    expect(canonicalFor('/')).toBe('https://logistique.pieces.ci')
    expect(canonicalFor('/devis')).toBe('https://logistique.pieces.ci/devis')
  })
})

describe('routage du sous-domaine', () => {
  it('reconnaît l\'hôte quel que soit le port ou la casse', () => {
    expect(isLogistiqueHost('logistique.pieces.ci')).toBe(true)
    expect(isLogistiqueHost('Logistique.localhost:3000')).toBe(true)
    expect(isLogistiqueHost('flotte.pieces.ci')).toBe(false)
    expect(isLogistiqueHost(null)).toBe(false)
  })

  it('n\'accepte que les slugs déclarés', () => {
    expect(isLogistiqueSlug('/')).toBe(true)
    expect(isLogistiqueSlug('/flottes-vtc')).toBe(true)
    expect(isLogistiqueSlug('/devis')).toBe(true)
    expect(isLogistiqueSlug('/suivi/LOG-2607-8F3K')).toBe(true)
    expect(isLogistiqueSlug('/suivi/')).toBe(false)
    expect(isLogistiqueSlug('/login')).toBe(false)
    expect(isLogistiqueSlug('/enterprise/dashboard')).toBe(false)
  })

  it('mappe les slugs sur le route group interne', () => {
    expect(toLogistiqueInternalPath('/')).toBe('/logistique')
    expect(toLogistiqueInternalPath('/devis/merci')).toBe('/logistique/devis/merci')
  })
})
