import type { ChipVariant } from '@/components/ui/chip'
import type { TaskPriorityKey, TaskStatusKey } from '@/lib/erp-api'

// Libellés et variantes de puce de l'écran Tâches.
//
// Extraits dans un module pur (convention `_shared.ts` du projet) : ils sont
// testables sans monter de composant, et la page reste lisible.

export const TASK_STATUS_LABELS: Record<TaskStatusKey, string> = {
  OPEN: 'À faire',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminée',
  CANCELLED: 'Annulée',
}

export const TASK_STATUS_CHIP: Record<TaskStatusKey, ChipVariant> = {
  OPEN: 'plain',
  IN_PROGRESS: 'status-warn',
  DONE: 'status-ok',
  CANCELLED: 'oem',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriorityKey, string> = {
  LOW: 'Basse',
  NORMAL: 'Normale',
  HIGH: 'Haute',
  URGENT: 'Urgente',
}

export const TASK_PRIORITY_CHIP: Record<TaskPriorityKey, ChipVariant> = {
  LOW: 'plain',
  NORMAL: 'occasion',
  HIGH: 'reusine',
  URGENT: 'status-err',
}

/** Ordre d'affichage dans les filtres — du travail à faire vers l'archive. */
export const TASK_STATUS_ORDER: TaskStatusKey[] = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']

export const TASK_PRIORITY_ORDER: TaskPriorityKey[] = ['URGENT', 'HIGH', 'NORMAL', 'LOW']

/** Statuts clôturés : ni « en retard », ni comptés dans la charge. */
export const CLOSED_TASK_STATUSES: TaskStatusKey[] = ['DONE', 'CANCELLED']

export function isClosed(status: TaskStatusKey): boolean {
  return CLOSED_TASK_STATUSES.includes(status)
}

/** Une tâche est en retard si son échéance est passée et qu'elle reste ouverte. */
export function isOverdue(
  dueAt: string | null,
  status: TaskStatusKey,
  now: Date = new Date(),
): boolean {
  if (!dueAt || isClosed(status)) return false
  return new Date(dueAt).getTime() < now.getTime()
}

/**
 * Échéance en clair : « aujourd'hui », « demain », « il y a 3 jours ».
 * Une date brute oblige à compter mentalement ; ici l'urgence se lit.
 */
export function formatDueLabel(dueAt: string | null, now: Date = new Date()): string {
  if (!dueAt) return '—'
  const due = new Date(dueAt)
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86_400_000)

  if (days === 0) return 'Aujourd’hui'
  if (days === 1) return 'Demain'
  if (days === -1) return 'Hier'
  if (days > 1 && days <= 7) return `Dans ${days} jours`
  if (days < -1 && days >= -7) return `Il y a ${Math.abs(days)} jours`
  return due.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Prochain statut proposé par l'action rapide d'une ligne. */
export function nextStatusFor(status: TaskStatusKey): TaskStatusKey | null {
  if (status === 'OPEN') return 'IN_PROGRESS'
  if (status === 'IN_PROGRESS') return 'DONE'
  return null
}

export function nextStatusLabel(status: TaskStatusKey): string | null {
  const next = nextStatusFor(status)
  if (!next) return null
  return next === 'IN_PROGRESS' ? 'Démarrer' : 'Terminer'
}
