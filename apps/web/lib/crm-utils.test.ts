import { describe, it, expect } from 'vitest'
import {
  CLIENT_SEGMENT_LABELS,
  VENDOR_SEGMENT_LABELS,
  TASK_STATUS_LABELS,
  INTERACTION_TYPE_LABELS,
  TIMELINE_KIND_LABELS,
  segmentLabel,
  taskStatusVariant,
  interactionTypeVariant,
  timelineKindLabel,
  subjectHref,
  dateInputToIsoEndOfDay,
  isTaskOverdue,
  formatRelativeDay,
  formatShortDate,
  describeEcheance,
} from './crm-utils'

describe('labels CRM', () => {
  it('couvre les 5 segments clients du contrat API', () => {
    expect(Object.keys(CLIENT_SEGMENT_LABELS).sort()).toEqual(
      ['a_risque', 'actif', 'fidele', 'inactif', 'nouveau'].sort(),
    )
    expect(CLIENT_SEGMENT_LABELS.fidele).toBe('Fidèle')
  })

  it('couvre les 4 segments vendeurs du contrat API', () => {
    expect(Object.keys(VENDOR_SEGMENT_LABELS).sort()).toEqual(
      ['actif', 'fiche_incomplete', 'litiges_ouverts', 'sans_commande_30j'].sort(),
    )
    expect(VENDOR_SEGMENT_LABELS.sans_commande_30j).toBe('Sans commande 30 j')
  })

  it('couvre tous les statuts de tâche et types d’interaction', () => {
    expect(Object.keys(TASK_STATUS_LABELS).sort()).toEqual(['A_FAIRE', 'ANNULE', 'FAIT'].sort())
    expect(Object.keys(INTERACTION_TYPE_LABELS).sort()).toEqual(
      ['APPEL', 'EMAIL', 'NOTE', 'RELANCE', 'VISITE', 'WHATSAPP'].sort(),
    )
  })

  it('segmentLabel retombe sur la clé brute si inconnue', () => {
    expect(segmentLabel('actif', CLIENT_SEGMENT_LABELS)).toBe('Actif')
    expect(segmentLabel('inconnu', CLIENT_SEGMENT_LABELS)).toBe('inconnu')
  })

  it('timelineKindLabel traduit les kinds, retombe sur la clé sinon', () => {
    expect(Object.keys(TIMELINE_KIND_LABELS).sort()).toEqual(
      ['avis', 'commande', 'demande', 'interaction', 'litige', 'retour'].sort(),
    )
    expect(timelineKindLabel('commande')).toBe('Commande')
    expect(timelineKindLabel('autre')).toBe('autre')
  })
})

describe('variantes de chips', () => {
  it('taskStatusVariant', () => {
    expect(taskStatusVariant('A_FAIRE')).toBe('status-warn')
    expect(taskStatusVariant('FAIT')).toBe('status-ok')
    expect(taskStatusVariant('ANNULE')).toBe('plain')
  })

  it('interactionTypeVariant', () => {
    expect(interactionTypeVariant('NOTE')).toBe('plain')
    expect(interactionTypeVariant('RELANCE')).toBe('reusine')
    expect(interactionTypeVariant('WHATSAPP')).toBe('status-ok')
  })
})

describe('subjectHref', () => {
  it('route vers la fiche client ou vendeur selon le sujet', () => {
    expect(subjectHref('USER', 'u1')).toBe('/admin/clients/u1')
    expect(subjectHref('VENDOR', 'v1')).toBe('/admin/vendors/v1')
  })
})

describe('dateInputToIsoEndOfDay', () => {
  it('convertit une date input en ISO fin de journée locale', () => {
    const iso = dateInputToIsoEndOfDay('2026-08-01')
    expect(iso).not.toBeNull()
    const d = new Date(iso as string)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(1)
    expect(d.getHours()).toBe(23)
    expect(d.getMinutes()).toBe(59)
    expect(d.getSeconds()).toBe(59)
  })

  it('rejette les valeurs vides ou invalides', () => {
    expect(dateInputToIsoEndOfDay('')).toBeNull()
    expect(dateInputToIsoEndOfDay('01/08/2026')).toBeNull()
    expect(dateInputToIsoEndOfDay('2026-13-01')).toBeNull()
    expect(dateInputToIsoEndOfDay('2026-02-30')).toBeNull()
  })
})

describe('isTaskOverdue', () => {
  const now = new Date('2026-07-31T12:00:00')

  it('vrai seulement si échéance passée et tâche à faire', () => {
    expect(isTaskOverdue('2026-07-30T10:00:00', 'A_FAIRE', now)).toBe(true)
    expect(isTaskOverdue('2026-08-01T10:00:00', 'A_FAIRE', now)).toBe(false)
    expect(isTaskOverdue('2026-07-30T10:00:00', 'FAIT', now)).toBe(false)
    expect(isTaskOverdue(null, 'A_FAIRE', now)).toBe(false)
  })
})

describe('formatRelativeDay', () => {
  const now = new Date('2026-07-31T12:00:00')

  it('nomme aujourd’hui, demain et hier', () => {
    expect(formatRelativeDay('2026-07-31T08:00:00', now)).toBe("Aujourd'hui")
    expect(formatRelativeDay('2026-08-01T23:00:00', now)).toBe('Demain')
    expect(formatRelativeDay('2026-07-30T01:00:00', now)).toBe('Hier')
  })

  it('compte les jours au-delà', () => {
    expect(formatRelativeDay('2026-08-05T10:00:00', now)).toBe('Dans 5 j')
    expect(formatRelativeDay('2026-07-21T10:00:00', now)).toBe('Il y a 10 j')
  })

  it('retourne une chaîne vide pour une date invalide', () => {
    expect(formatRelativeDay('n/a', now)).toBe('')
  })
})

describe('formatShortDate', () => {
  it('formate en jj/mm/aaaa', () => {
    expect(formatShortDate('2026-07-31T10:00:00Z')).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('retourne — pour une date invalide', () => {
    expect(formatShortDate('n/a')).toBe('—')
  })
})

describe('describeEcheance', () => {
  const now = new Date('2026-07-31T12:00:00')

  it('marque en retard une échéance passée à faire', () => {
    const r = describeEcheance('2026-07-30T10:00:00', 'A_FAIRE', now)
    expect(r.overdue).toBe(true)
    expect(r.text).toContain('Hier')
  })

  it('sans échéance : tiret, pas de retard', () => {
    expect(describeEcheance(null, 'A_FAIRE', now)).toEqual({ text: '—', overdue: false })
  })
})
