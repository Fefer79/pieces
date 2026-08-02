import { describe, it, expect } from 'vitest'
import {
  METRIC_LABELS,
  COMMISSION_STATUS_LABELS,
  commissionStatusVariant,
  currentPeriode,
  formatPeriode,
  recentPeriodes,
  progressPct,
  progressTone,
  PROGRESS_BAR_CLASS,
  ACTIVITY_ACTION_LABELS,
  activityLabel,
  formatShortDate,
} from './equipe-utils'
import type { AgentCommissionStatus, AgentObjectiveMetric } from './equipe-api'

describe('labels des métriques et statuts', () => {
  it('couvre les 7 métriques et les 4 statuts', () => {
    const metriques: AgentObjectiveMetric[] = [
      'VENDEURS_GERES',
      'NOUVEAUX_VENDEURS',
      'PROSPECTS_CONCLUS',
      'PIECES_AJOUTEES',
      'INTERACTIONS_CRM',
      'TACHES_FAITES',
      'VISITES_TERRAIN',
    ]
    for (const m of metriques) expect(METRIC_LABELS[m]).toBeTruthy()

    const statuts: AgentCommissionStatus[] = ['ESTIMEE', 'DUE', 'PAYEE', 'ANNULEE']
    for (const s of statuts) expect(COMMISSION_STATUS_LABELS[s]).toBeTruthy()
  })

  it('variantes de chips par statut', () => {
    expect(commissionStatusVariant('PAYEE')).toBe('status-ok')
    expect(commissionStatusVariant('DUE')).toBe('status-warn')
    expect(commissionStatusVariant('ANNULEE')).toBe('status-err')
    expect(commissionStatusVariant('ESTIMEE')).toBe('plain')
  })
})

describe('périodes', () => {
  it('currentPeriode formate en YYYY-MM (UTC)', () => {
    expect(currentPeriode(new Date('2026-08-02T10:00:00Z'))).toBe('2026-08')
  })

  it('formatPeriode rend le mois en français', () => {
    expect(formatPeriode('2026-08')).toBe('août 2026')
    expect(formatPeriode('2026-01')).toBe('janvier 2026')
    expect(formatPeriode('2026-12')).toBe('décembre 2026')
  })

  it('formatPeriode retourne l’entrée si mal formée', () => {
    expect(formatPeriode('N/A')).toBe('N/A')
    expect(formatPeriode('2026')).toBe('2026')
  })

  it('recentPeriodes enchaîne les mois à rebours, année comprise', () => {
    expect(recentPeriodes(4, new Date('2026-02-10T00:00:00Z'))).toEqual([
      '2026-02',
      '2026-01',
      '2025-12',
      '2025-11',
    ])
  })
})

describe('progression des objectifs', () => {
  it('progressPct calcule et plafonne à 100', () => {
    expect(progressPct(5, 20)).toBe(25)
    expect(progressPct(20, 20)).toBe(100)
    expect(progressPct(25, 20)).toBe(100)
    expect(progressPct(0, 20)).toBe(0)
  })

  it('progressPct vaut 0 si la cible est nulle ou négative', () => {
    expect(progressPct(10, 0)).toBe(0)
  })

  it('progressTone : rouge < 50 %, orange < 100 %, vert à 100 %', () => {
    expect(progressTone(25)).toBe('err')
    expect(progressTone(50)).toBe('warn')
    expect(progressTone(99)).toBe('warn')
    expect(progressTone(100)).toBe('ok')
    expect(PROGRESS_BAR_CLASS[progressTone(100)]).toBe('bg-success-fg')
  })
})

describe('activité et dates', () => {
  it('activityLabel traduit les actions connues, replie sur le brut', () => {
    expect(activityLabel('action', 'LIAISON_VENDOR_CREATED')).toBe('Vendeur créé')
    expect(activityLabel('action', 'COMMISSION_PAID')).toBe('Commission payée')
    expect(activityLabel('action', 'ACTION_INCONNUE')).toBe('ACTION_INCONNUE')
    expect(activityLabel('interaction', 'APPEL')).toBe('Interaction appel')
  })

  it('ACTIVITY_ACTION_LABELS couvre les actions équipe', () => {
    for (const a of [
      'EQUIPE_PROFILE_UPDATED',
      'OBJECTIVE_SET',
      'COMMISSION_GENERATED',
      'COMMISSION_UPDATED',
      'COMMISSION_PAID',
      'COMMISSION_CANCELLED',
    ]) {
      expect(ACTIVITY_ACTION_LABELS[a]).toBeTruthy()
    }
  })

  it('formatShortDate formate ou met un tiret', () => {
    expect(formatShortDate('2026-08-02T10:00:00Z')).toBe(
      new Date('2026-08-02T10:00:00Z').toLocaleDateString('fr-FR'),
    )
    expect(formatShortDate(null)).toBe('—')
  })
})
