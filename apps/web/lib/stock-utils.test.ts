import { describe, it, expect } from 'vitest'
import {
  LOCATION_TYPE_LABELS,
  LEVEL_STATUS_LABELS,
  levelStatusVariant,
  MOVEMENT_TYPE_LABELS,
  movementTypeVariant,
  movementQuantityPrefix,
  PO_STATUS_LABELS,
  poStatusVariant,
  PO_TRANSITIONS,
  nextPoTransitions,
  poTransitionActionLabel,
  PO_MODES,
  poModeLabel,
  poModeTransitDays,
  isImportMode,
  computePoAmount,
  computePoWeight,
  poLineRemaining,
  formatShortDate,
  partStockStatus,
  partStockChipOf,
  PART_STOCK_FILTER_LABELS,
} from './stock-utils'

describe('libellés stock', () => {
  it('couvre les types d’emplacement, statuts de niveau et types de mouvement', () => {
    expect(Object.keys(LOCATION_TYPE_LABELS).sort()).toEqual(
      ['BOUTIQUE', 'ENTREPOT', 'TRANSIT'].sort(),
    )
    expect(Object.keys(LEVEL_STATUS_LABELS).sort()).toEqual(['bas', 'ok', 'rupture'].sort())
    expect(Object.keys(MOVEMENT_TYPE_LABELS).sort()).toEqual(
      ['AJUSTEMENT', 'RECEPTION', 'RESTITUTION', 'SORTIE_COMMANDE'].sort(),
    )
    expect(LEVEL_STATUS_LABELS.bas).toBe('Stock bas')
    expect(MOVEMENT_TYPE_LABELS.SORTIE_COMMANDE).toBe('Sortie commande')
  })

  it('couvre les 6 statuts de bon de commande du contrat API', () => {
    expect(Object.keys(PO_STATUS_LABELS).sort()).toEqual(
      [
        'ANNULEE',
        'BROUILLON',
        'ENVOYEE',
        'EN_TRANSIT',
        'RECEPTIONNEE',
        'RECEPTION_PARTIELLE',
      ].sort(),
    )
    expect(PO_STATUS_LABELS.RECEPTION_PARTIELLE).toBe('Réception partielle')
  })
})

describe('variantes de chips', () => {
  it('levelStatusVariant', () => {
    expect(levelStatusVariant('rupture')).toBe('status-err')
    expect(levelStatusVariant('bas')).toBe('status-warn')
    expect(levelStatusVariant('ok')).toBe('status-ok')
  })

  it('movementTypeVariant', () => {
    expect(movementTypeVariant('RECEPTION')).toBe('status-ok')
    expect(movementTypeVariant('RESTITUTION')).toBe('status-ok')
    expect(movementTypeVariant('SORTIE_COMMANDE')).toBe('status-warn')
    expect(movementTypeVariant('AJUSTEMENT')).toBe('plain')
  })

  it('poStatusVariant', () => {
    expect(poStatusVariant('BROUILLON')).toBe('plain')
    expect(poStatusVariant('ENVOYEE')).toBe('status-warn')
    expect(poStatusVariant('RECEPTIONNEE')).toBe('status-ok')
    expect(poStatusVariant('ANNULEE')).toBe('status-err')
  })
})

describe('movementQuantityPrefix', () => {
  it('signe les entrées et sorties, « ± » pour les ajustements', () => {
    expect(movementQuantityPrefix('RECEPTION')).toBe('+')
    expect(movementQuantityPrefix('RESTITUTION')).toBe('+')
    expect(movementQuantityPrefix('SORTIE_COMMANDE')).toBe('−')
    expect(movementQuantityPrefix('AJUSTEMENT')).toBe('±')
  })
})

describe('matrice de transitions des BC', () => {
  it('est recopiée du service API (PO_TRANSITIONS)', () => {
    expect(PO_TRANSITIONS.BROUILLON).toEqual(['ENVOYEE', 'ANNULEE'])
    expect(PO_TRANSITIONS.ENVOYEE).toEqual(['EN_TRANSIT', 'ANNULEE'])
    expect(PO_TRANSITIONS.EN_TRANSIT).toEqual(['ANNULEE'])
    expect(PO_TRANSITIONS.RECEPTION_PARTIELLE).toEqual(['RECEPTIONNEE'])
    expect(PO_TRANSITIONS.RECEPTIONNEE).toEqual([])
    expect(PO_TRANSITIONS.ANNULEE).toEqual([])
  })

  it('nextPoTransitions expose les transitions sortantes', () => {
    expect(nextPoTransitions('BROUILLON')).toContain('ENVOYEE')
    expect(nextPoTransitions('RECEPTIONNEE')).toHaveLength(0)
  })

  it('poTransitionActionLabel traduit les cibles', () => {
    expect(poTransitionActionLabel('ENVOYEE')).toBe('Envoyer au fournisseur')
    expect(poTransitionActionLabel('ANNULEE')).toBe('Annuler le bon')
  })
})

describe('modes logistiques', () => {
  it('propose les 5 modes d’achat (PRE_POSITIONED exclu)', () => {
    expect(PO_MODES).toEqual(['LOCAL', 'AIR_NOW', 'AIR_STANDARD', 'AIR_ECONOMY', 'SEA_LCL'])
  })

  it('poModeLabel et poModeTransitDays lisent LOGISTICS_MODES', () => {
    expect(poModeLabel('AIR_STANDARD')).toBe('Aérien standard')
    expect(poModeTransitDays('AIR_STANDARD')).toBe(5)
    expect(poModeTransitDays('SEA_LCL')).toBe(45)
    expect(poModeLabel('INCONNU')).toBe('INCONNU')
  })

  it('isImportMode distingue import et local', () => {
    expect(isImportMode('AIR_NOW')).toBe(true)
    expect(isImportMode('SEA_LCL')).toBe(true)
    expect(isImportMode('LOCAL')).toBe(false)
  })
})

describe('totaux de lignes de BC', () => {
  it('computePoAmount somme quantité × prix', () => {
    expect(
      computePoAmount([
        { quantite: 10, prixUnitaire: 25.5 },
        { quantite: 4, prixUnitaire: 100 },
      ]),
    ).toBe(655)
    expect(computePoAmount([])).toBe(0)
  })

  it('computePoWeight pondère par la quantité, 0 si poids absent', () => {
    expect(
      computePoWeight([
        { quantite: 10, prixUnitaire: 25.5, poidsEstimeKg: 2 },
        { quantite: 4, prixUnitaire: 100 },
        { quantite: 2, prixUnitaire: 10, poidsEstimeKg: null },
      ]),
    ).toBe(20)
  })

  it('poLineRemaining ne descend pas sous zéro', () => {
    expect(poLineRemaining({ quantite: 5, quantiteRecue: 3 })).toBe(2)
    expect(poLineRemaining({ quantite: 5, quantiteRecue: 5 })).toBe(0)
    expect(poLineRemaining({ quantite: 5, quantiteRecue: 7 })).toBe(0)
  })
})

describe('formatShortDate', () => {
  it('formate en fr-FR, tiret si absente', () => {
    expect(formatShortDate(null)).toBe('—')
    expect(formatShortDate('2026-07-31T10:00:00.000Z')).toBe(
      new Date('2026-07-31T10:00:00.000Z').toLocaleDateString('fr-FR'),
    )
  })
})

describe('chip stock d’une fiche catalogue', () => {
  it('partStockStatus : non suivi, rupture, bas, ok', () => {
    expect(partStockStatus({ stockQuantity: null, lowStockThreshold: 1 })).toBe('non-suivi')
    expect(partStockStatus({ stockQuantity: 0, lowStockThreshold: 1 })).toBe('rupture')
    expect(partStockStatus({ stockQuantity: 1, lowStockThreshold: 1 })).toBe('bas')
    expect(partStockStatus({ stockQuantity: 5, lowStockThreshold: 1 })).toBe('ok')
  })

  it('partStockChipOf colore le chip selon le statut', () => {
    expect(partStockChipOf({ stockQuantity: null, lowStockThreshold: 1 })).toEqual({
      label: 'Non suivi',
      variant: 'plain',
    })
    expect(partStockChipOf({ stockQuantity: 0, lowStockThreshold: 1 })).toEqual({
      label: 'Stock : 0',
      variant: 'status-err',
    })
    expect(partStockChipOf({ stockQuantity: 2, lowStockThreshold: 3 })).toEqual({
      label: 'Stock : 2',
      variant: 'status-warn',
    })
    expect(partStockChipOf({ stockQuantity: 9, lowStockThreshold: 3 })).toEqual({
      label: 'Stock : 9',
      variant: 'status-ok',
    })
  })

  it('PART_STOCK_FILTER_LABELS couvre les 4 statuts', () => {
    expect(Object.keys(PART_STOCK_FILTER_LABELS).sort()).toEqual(
      ['bas', 'non-suivi', 'ok', 'rupture'].sort(),
    )
  })
})
