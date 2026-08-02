import type { ChipVariant } from '@/components/ui/chip'
import type { AgentCommissionStatus, AgentObjectiveMetric } from '@/lib/equipe-api'

// ---------------------------------------------------------------------------
// Libellés et variantes de chips — miroir des enums de l'API équipe
// ---------------------------------------------------------------------------

export const METRIC_LABELS: Record<AgentObjectiveMetric, string> = {
  VENDEURS_GERES: 'Vendeurs gérés',
  NOUVEAUX_VENDEURS: 'Nouveaux vendeurs',
  PROSPECTS_CONCLUS: 'Prospects conclus',
  PIECES_AJOUTEES: 'Pièces ajoutées',
  INTERACTIONS_CRM: 'Interactions CRM',
  TACHES_FAITES: 'Tâches faites',
  VISITES_TERRAIN: 'Visites terrain',
}

export const COMMISSION_STATUS_LABELS: Record<AgentCommissionStatus, string> = {
  ESTIMEE: 'Estimée',
  DUE: 'Due',
  PAYEE: 'Payée',
  ANNULEE: 'Annulée',
}

export function commissionStatusVariant(statut: AgentCommissionStatus): ChipVariant {
  if (statut === 'PAYEE') return 'status-ok'
  if (statut === 'DUE') return 'status-warn'
  if (statut === 'ANNULEE') return 'status-err'
  return 'plain'
}

// ---------------------------------------------------------------------------
// Périodes mensuelles 'YYYY-MM'
// ---------------------------------------------------------------------------

const MOIS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

/** Période courante au format 'YYYY-MM' (UTC, comme l'API). */
export function currentPeriode(now = new Date()): string {
  return now.toISOString().slice(0, 7)
}

/** '2026-08' → « août 2026 » ; retourne l'entrée telle quelle si mal formée. */
export function formatPeriode(periode: string): string {
  const [y, m] = periode.split('-').map(Number)
  const mois = MOIS_FR[(m ?? 0) - 1]
  if (!y || !mois) return periode
  return `${mois} ${y}`
}

/** Liste les N dernières périodes ('YYYY-MM'), la plus récente d'abord. */
export function recentPeriodes(count: number, from = new Date()): string[] {
  const [y0, m0] = currentPeriode(from).split('-').map(Number)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(y0 ?? 0, (m0 ?? 1) - 1 - i, 1))
    out.push(d.toISOString().slice(0, 7))
  }
  return out
}

// ---------------------------------------------------------------------------
// Progression des objectifs
// ---------------------------------------------------------------------------

/** Pourcentage de progression plafonné à 100 (cible ≤ 0 → 0). */
export function progressPct(progression: number, cible: number): number {
  if (cible <= 0) return 0
  return Math.min(100, Math.round((progression / cible) * 100))
}

export type ProgressTone = 'err' | 'warn' | 'ok'

/** Ton de la barre de progression : < 50 % rouge, < 100 % orange, 100 % vert. */
export function progressTone(pct: number): ProgressTone {
  if (pct >= 100) return 'ok'
  if (pct >= 50) return 'warn'
  return 'err'
}

export const PROGRESS_BAR_CLASS: Record<ProgressTone, string> = {
  err: 'bg-error-fg',
  warn: 'bg-warn-fg',
  ok: 'bg-success-fg',
}

// ---------------------------------------------------------------------------
// Libellés d'activité (fiche membre)
// ---------------------------------------------------------------------------

/** Libellés connus du journal d'activité ; l'action brute sert de repli. */
export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  LIAISON_VENDOR_CREATED: 'Vendeur créé',
  LIAISON_VENDOR_UPDATED: 'Vendeur modifié',
  LIAISON_PART_CREATED: 'Pièce ajoutée',
  LIAISON_QUICK_PART_CREATED: 'Pièce ajoutée (saisie rapide)',
  LIAISON_PART_UPDATED: 'Pièce modifiée',
  LIAISON_COMMISSION_ACCEPTED: 'Commission agréée',
  CONTACT_CREATED: 'Prospect créé',
  CONTACT_ACTIVITY_LOGGED: 'Activité prospect consignée',
  CONTACT_CONVERTED: 'Prospect converti en vendeur',
  CRM_INTERACTION_ADDED: 'Interaction CRM',
  CRM_TASK_CREATED: 'Tâche CRM créée',
  CRM_TASK_UPDATED: 'Tâche CRM mise à jour',
  EQUIPE_PROFILE_UPDATED: 'Profil équipe mis à jour',
  OBJECTIVE_SET: 'Objectif fixé',
  COMMISSION_GENERATED: 'Commissions générées',
  COMMISSION_UPDATED: 'Commission modifiée',
  COMMISSION_PAID: 'Commission payée',
  COMMISSION_CANCELLED: 'Commission annulée',
}

export function activityLabel(kind: 'action' | 'interaction', label: string): string {
  if (kind === 'interaction') return `Interaction ${label.toLowerCase()}`
  return ACTIVITY_ACTION_LABELS[label] ?? label
}

/** Date ISO → libellé court fr-FR (« 02/08/2026 »), tiret si absente. */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR')
}
