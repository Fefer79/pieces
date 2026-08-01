import type { ChipVariant } from '@/components/ui/chip'
import type { CrmInteractionType, CrmSubject, CrmTaskStatus } from '@/lib/crm-api'

// ---------------------------------------------------------------------------
// Labels FR (jamais de vocabulaire technique brut dans l'UI)
// ---------------------------------------------------------------------------

export const CLIENT_SEGMENT_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  actif: 'Actif',
  fidele: 'Fidèle',
  a_risque: 'À risque',
  inactif: 'Inactif',
}

export const VENDOR_SEGMENT_LABELS: Record<string, string> = {
  actif: 'Actif',
  sans_commande_30j: 'Sans commande 30 j',
  fiche_incomplete: 'Fiche incomplète',
  litiges_ouverts: 'Litiges ouverts',
}

export function segmentLabel(segment: string, labels: Record<string, string>): string {
  return labels[segment] ?? segment
}

export const TASK_STATUS_LABELS: Record<CrmTaskStatus, string> = {
  A_FAIRE: 'À faire',
  FAIT: 'Fait',
  ANNULE: 'Annulé',
}

export function taskStatusVariant(statut: CrmTaskStatus): ChipVariant {
  switch (statut) {
    case 'FAIT':
      return 'status-ok'
    case 'ANNULE':
      return 'plain'
    default:
      return 'status-warn'
  }
}

export const INTERACTION_TYPE_LABELS: Record<CrmInteractionType, string> = {
  NOTE: 'Note',
  APPEL: 'Appel',
  WHATSAPP: 'WhatsApp',
  VISITE: 'Visite',
  EMAIL: 'Email',
  RELANCE: 'Relance',
}

export function interactionTypeVariant(type: CrmInteractionType): ChipVariant {
  switch (type) {
    case 'APPEL':
      return 'oem'
    case 'WHATSAPP':
      return 'status-ok'
    case 'VISITE':
      return 'occasion'
    case 'EMAIL':
      return 'aftermarket'
    case 'RELANCE':
      return 'reusine'
    default:
      return 'plain'
  }
}

export const TIMELINE_KIND_LABELS: Record<string, string> = {
  interaction: 'Interaction',
  commande: 'Commande',
  litige: 'Litige',
  retour: 'Retour',
  avis: 'Avis',
  demande: 'Demande',
}

export function timelineKindLabel(kind: string): string {
  return TIMELINE_KIND_LABELS[kind] ?? kind
}

// ---------------------------------------------------------------------------
// Liens fiches
// ---------------------------------------------------------------------------

export function subjectHref(subject: CrmSubject, subjectId: string): string {
  return subject === 'USER' ? `/admin/clients/${subjectId}` : `/admin/vendors/${subjectId}`
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/**
 * Convertit la valeur d'un `<input type="date">` ('2026-08-01') en ISO de fin
 * de journée locale (23:59:59.999) — une échéance choisie au jour reste due ce
 * jour-là. Retourne null si la valeur est vide ou invalide.
 */
export function dateInputToIsoEndOfDay(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const d = new Date(year, month - 1, day, 23, 59, 59, 999)
  if (Number.isNaN(d.getTime()) || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return d.toISOString()
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Une tâche est en retard si son échéance est passée et qu'elle reste à faire. */
export function isTaskOverdue(
  echeanceLe: string | null,
  statut: CrmTaskStatus,
  now: Date = new Date(),
): boolean {
  if (!echeanceLe || statut !== 'A_FAIRE') return false
  return new Date(echeanceLe).getTime() < now.getTime()
}

/** Libellé relatif au jour calendaire : Aujourd'hui / Demain / Hier / Dans N j / Il y a N j. */
export function formatRelativeDay(iso: string, now: Date = new Date()): string {
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return ''
  const diffDays = Math.round(
    (startOfDay(target).getTime() - startOfDay(now).getTime()) / DAY_MS,
  )
  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Demain'
  if (diffDays === -1) return 'Hier'
  return diffDays > 1 ? `Dans ${diffDays} j` : `Il y a ${-diffDays} j`
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Échéance de tâche : date courte + mention relative, marquée si en retard. */
export function describeEcheance(
  echeanceLe: string | null,
  statut: CrmTaskStatus,
  now: Date = new Date(),
): { text: string; overdue: boolean } {
  if (!echeanceLe) return { text: '—', overdue: false }
  const overdue = isTaskOverdue(echeanceLe, statut, now)
  return { text: `${formatShortDate(echeanceLe)} · ${formatRelativeDay(echeanceLe, now)}`, overdue }
}
