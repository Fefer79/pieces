import type { Job } from '@prisma/client'
import { enqueue, markCompleted, markFailed } from '../queueService.js'
import { prisma } from '../../../lib/prisma.js'
import { notifyWhatsAppUser } from '../../whatsapp/whatsapp.service.js'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

// Prochaine occurrence de 7h00 (heure serveur) — le scan est quotidien matinal.
export function nextSevenAm(): Date {
  const next = new Date()
  next.setHours(7, 0, 0, 0)
  if (next <= new Date()) next.setDate(next.getDate() + 1)
  return next
}

/**
 * Rappel quotidien des tâches CRM dues : tâches A_FAIRE dont l'échéance est
 * passée ou aujourd'hui, jamais rappelées, avec un assigné. Un seul message
 * WhatsApp par assigné (digest), puis marquage rappelEnvoyeAt — uniquement si
 * l'envoi a réussi, pour retenter au prochain scan sinon.
 * Le job se re-planifie lui-même au prochain 7h00 (pas de cron externe) ; le
 * backstop au démarrage (server.ts) recrée un job si la chaîne s'interrompt.
 */
export async function handleCrmDueTasksScan(job: Job, logger: Logger) {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const tasks = await prisma.crmTask.findMany({
      where: {
        statut: 'A_FAIRE',
        echeanceLe: { lt: endOfDay },
        rappelEnvoyeAt: null,
        assigneeId: { not: null },
      },
      include: { assignee: { select: { id: true, phone: true, name: true } } },
    })

    // Regroupe par assigné : un seul WhatsApp digest par personne.
    const byAssignee = new Map<string, { phone: string; ids: string[]; overdue: number }>()
    for (const task of tasks) {
      if (!task.assigneeId || !task.assignee?.phone) continue
      const group = byAssignee.get(task.assigneeId) ?? {
        phone: task.assignee.phone,
        ids: [],
        overdue: 0,
      }
      group.ids.push(task.id)
      if (task.echeanceLe && task.echeanceLe < startOfDay) group.overdue += 1
      byAssignee.set(task.assigneeId, group)
    }

    let assigneesNotified = 0
    let tasksReminded = 0
    for (const group of byAssignee.values()) {
      const res = await notifyWhatsAppUser(
        group.phone,
        `Rappel CRM : ${group.ids.length} tâche(s) due(s) aujourd'hui (${group.overdue} en retard) — voir /admin/crm`,
      )
      // Échec d'envoi → on ne marque rien, retentative au prochain scan.
      if (!res.sent) continue
      assigneesNotified++
      tasksReminded += group.ids.length
      await prisma.crmTask.updateMany({
        where: { id: { in: group.ids } },
        data: { rappelEnvoyeAt: new Date() },
      })
    }

    logger.info(
      { event: 'CRM_DUE_TASKS_REMINDED', tasksDue: tasks.length, assigneesNotified, tasksReminded },
      'CRM due tasks scan complete',
    )
    await enqueue('CRM_DUE_TASKS_SCAN', {}, { scheduledAt: nextSevenAm() })
    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn({ event: 'CRM_DUE_TASKS_FAILED', error: message }, 'CRM due tasks scan failed')
    await markFailed(job.id, message)
  }
}
