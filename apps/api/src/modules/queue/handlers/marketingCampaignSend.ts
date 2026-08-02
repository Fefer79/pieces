import type { Job } from '@prisma/client'
import { markCompleted, markFailed } from '../queueService.js'
import { prisma } from '../../../lib/prisma.js'
import { notifyWhatsAppUser } from '../../whatsapp/whatsapp.service.js'
// Import cross-module, assumé : la résolution d'audience vit dans le module
// marketing (partagée entre l'aperçu, le lancement et ce handler) — la
// dupliquer ici ferait diverger les règles d'opt-out.
import { resolveAudienceRecipients } from '../../marketing/marketing.service.js'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

// Pause entre deux envois WhatsApp : ménage le fournisseur (Meta / Baileys)
// et lisse le débit sur les grosses audiences.
const SEND_DELAY_MS = 200
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Envoi d'une campagne marketing. Job à la demande (créé au lancement,
 * maxAttempts 1 : jamais de retry, donc jamais de doublon d'envoi en cas
 * d'échec global). Sortie silencieuse si la campagne a été annulée ou est déjà
 * terminée. Chaque envoi tenté est tracé en CrmInteraction (type RELANCE,
 * meta.campaignId) — best-effort, sans faire échouer la boucle.
 */
export async function handleMarketingCampaignSend(job: Job, logger: Logger) {
  try {
    const payload = job.payload as { campaignId?: string } | null
    const campaignId = payload?.campaignId
    if (!campaignId) {
      logger.warn({ event: 'MARKETING_CAMPAIGN_NO_ID', jobId: job.id }, 'Campaign job without campaignId')
      await markCompleted(job.id)
      return
    }

    const campaign = await prisma.marketingCampaign.findUnique({ where: { id: campaignId } })
    if (!campaign || campaign.statut === 'ANNULEE' || campaign.statut === 'TERMINEE') {
      await markCompleted(job.id)
      return
    }

    if (campaign.statut === 'PLANIFIEE') {
      await prisma.marketingCampaign.update({
        where: { id: campaign.id },
        data: { statut: 'EN_COURS', startedAt: new Date() },
      })
    }

    const recipients = await resolveAudienceRecipients(campaign.audienceType, campaign.audienceValue)

    let envoyes = 0
    let echecs = 0
    let optouts = 0
    let sansTelephone = 0

    for (const recipient of recipients) {
      if (recipient.optedOut) {
        optouts += 1
        continue
      }
      if (!recipient.phone) {
        sansTelephone += 1
        continue
      }

      const { sent, channel } = await notifyWhatsAppUser(recipient.phone, campaign.message)
      if (sent) envoyes += 1
      else echecs += 1

      // L'interaction est tracée même en cas d'échec d'envoi (meta.sent = false).
      await prisma.crmInteraction
        .create({
          data: {
            subject: recipient.subject,
            subjectId: recipient.subjectId,
            type: 'RELANCE',
            details: campaign.message,
            meta: { campaignId: campaign.id, sent, channel },
            authorId: campaign.createdById,
          },
        })
        .catch(() => {})

      await sleep(SEND_DELAY_MS)
    }

    await prisma.marketingCampaign.update({
      where: { id: campaign.id },
      data: {
        envoyes,
        echecs,
        optouts,
        sansTelephone,
        statut: 'TERMINEE',
        completedAt: new Date(),
      },
    })
    logger.info(
      { event: 'MARKETING_CAMPAIGN_SENT', campaignId: campaign.id, envoyes, echecs, optouts, sansTelephone },
      'Marketing campaign send complete',
    )
    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn({ event: 'MARKETING_CAMPAIGN_FAILED', error: message }, 'Marketing campaign send failed')
    await markFailed(job.id, message)
  }
}
