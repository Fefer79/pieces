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

  it('classe le maritime en dernier malgré le prix pièce le plus bas', () => {
    const last = result.options[result.options.length - 1]!
    expect(last.mode).toBe('SEA_LCL')
    expect(last.partPrice).toBe(32_000)
  })

  it('démontre que la pièce la moins chère produit le coût total le plus élevé', () => {
    const sea = result.options.find((o) => o.mode === 'SEA_LCL')!
    const best = result.options.find((o) => o.recommended)!
    expect(sea.partPrice).toBeLessThanOrEqual(best.partPrice)
    expect(sea.totalCost).toBeGreaterThan(best.totalCost * 10)
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
  ].join(' ')

  it('n\'emploie aucun vocabulaire de SLA, pénalité ou garantie de délai', () => {
    expect(allText).not.toMatch(/\bSLA\b|pénalit|garantissons|délai garanti|remboursement/i)
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
