import type { Prisma, Role } from '@prisma/client'
import {
  PROSPECTION_SCRIPT,
  PROSPECTION_CONSENT_SCRIPT,
  hasCapability,
  type ProspectionAnswerValue,
} from 'shared/constants'
import type {
  CreateProspectionInterviewInput,
  RecordProspectionConsentInput,
  UpdateProspectionInterviewInput,
  AppendProspectionTranscriptInput,
  ApplyProspectionInterviewInput,
  ProspectionInterviewListQuery,
} from 'shared/validators'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { recordActivity } from '../../lib/activityLog.js'
import { uploadToR2, downloadFromR2 } from '../../lib/r2.js'
import { enqueue } from '../queue/queueService.js'
import { extractInterviewAnswers } from '../../lib/gemini.js'
import type { StaffContext } from '../../plugins/erpAuth.js'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

/** Un LIAISON passé par son rôle plateforme n'a pas de `request.staff`. */
export type Actor = { userId: string; role: Role; staff: StaffContext | null }

const AUDIO_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
}

const interviewInclude = {
  prospect: { select: { id: true, name: true, shopName: true, phone: true, commune: true, statut: true } },
  vendor: { select: { id: true, shopName: true, phone: true, commune: true, status: true } },
  conductedBy: { select: { id: true, name: true } },
} as const

/** Vrai si l'acteur peut voir / éditer les entretiens de toute l'équipe. */
function canSeeAll(actor: Actor): boolean {
  return Boolean(actor.staff && hasCapability(actor.staff.capabilities, 'crm:read'))
}

function canWriteAll(actor: Actor): boolean {
  return Boolean(actor.staff && hasCapability(actor.staff.capabilities, 'crm:write'))
}

async function loadOwned(actor: Actor, id: string, requireWrite = false) {
  const interview = await prisma.prospectionInterview.findUnique({
    where: { id },
    include: interviewInclude,
  })
  if (!interview) {
    throw new AppError('PROSPECTION_INTERVIEW_NOT_FOUND', 404, { message: 'Entretien introuvable' })
  }
  const isOwner = interview.conductedById === actor.userId
  const allowed = isOwner || (requireWrite ? canWriteAll(actor) : canSeeAll(actor))
  if (!allowed) {
    throw new AppError('PROSPECTION_FORBIDDEN', 403, { message: 'Entretien non accessible' })
  }
  return interview
}

function assertConsent(interview: { consentGivenAt: Date | null }) {
  if (!interview.consentGivenAt) {
    throw new AppError('PROSPECTION_CONSENT_REQUIRED', 409, {
      message:
        "Le consentement du vendeur doit être enregistré avant tout audio ou toute transcription.",
    })
  }
}

export async function createInterview(actor: Actor, input: CreateProspectionInterviewInput) {
  if (input.prospectId) {
    const prospect = await prisma.vendorContact.findUnique({
      where: { id: input.prospectId },
      select: { id: true },
    })
    if (!prospect) throw new AppError('PROSPECT_NOT_FOUND', 404, { message: 'Prospect introuvable' })
  }
  if (input.vendorId) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: input.vendorId },
      select: { id: true },
    })
    if (!vendor) throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Vendeur introuvable' })
  }

  const interview = await prisma.prospectionInterview.create({
    data: {
      prospectId: input.prospectId ?? null,
      vendorId: input.vendorId ?? null,
      conductedById: actor.userId,
      status: 'BROUILLON',
    },
    include: interviewInclude,
  })

  await recordActivity({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'PROSPECTION_INTERVIEW_CREATED',
    targetType: 'ProspectionInterview',
    targetId: interview.id,
    payload: { prospectId: input.prospectId ?? null, vendorId: input.vendorId ?? null },
  })

  return interview
}

export async function listInterviews(actor: Actor, query: ProspectionInterviewListQuery) {
  const where: Record<string, unknown> = {}

  if (query.scope === 'all' && canSeeAll(actor)) {
    // pas de filtre sur le conducteur
  } else {
    where.conductedById = actor.userId
  }
  if (query.status) where.status = query.status
  if (query.prospectId) where.prospectId = query.prospectId
  if (query.vendorId) where.vendorId = query.vendorId

  const [items, total] = await Promise.all([
    prisma.prospectionInterview.findMany({
      where,
      include: interviewInclude,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.prospectionInterview.count({ where }),
  ])

  return { items: items.map(publicView), total }
}

export async function getInterview(actor: Actor, id: string) {
  const interview = await loadOwned(actor, id)
  return publicView(interview)
}

export async function recordConsent(actor: Actor, id: string, input: RecordProspectionConsentInput) {
  const interview = await loadOwned(actor, id, true)
  if (interview.consentGivenAt) {
    throw new AppError('PROSPECTION_CONSENT_ALREADY', 409, {
      message: 'Le consentement a déjà été enregistré pour cet entretien.',
    })
  }

  const updated = await prisma.prospectionInterview.update({
    where: { id },
    data: {
      consentGivenAt: new Date(),
      consentMethod: input.method,
      // Texte réellement lu, gelé. On retombe sur la constante si le client a
      // envoyé une chaîne vide après trim (le schéma impose min 10, ceinture +
      // bretelles).
      consentScriptText: input.scriptText.trim() || PROSPECTION_CONSENT_SCRIPT,
      consentGivenById: actor.userId,
      status: interview.status === 'BROUILLON' ? 'EN_COURS' : interview.status,
      startedAt: interview.startedAt ?? new Date(),
    },
    include: interviewInclude,
  })

  await recordActivity({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'PROSPECTION_CONSENT_RECORDED',
    targetType: 'ProspectionInterview',
    targetId: id,
    payload: { method: input.method },
  })

  return publicView(updated)
}

export async function updateInterview(
  actor: Actor,
  id: string,
  input: UpdateProspectionInterviewInput,
) {
  const interview = await loadOwned(actor, id, true)

  const data: Record<string, unknown> = {}
  if (input.status !== undefined) data.status = input.status
  if (input.notes !== undefined) data.notes = input.notes
  if (input.startedAt !== undefined) data.startedAt = input.startedAt ? new Date(input.startedAt) : null
  if (input.endedAt !== undefined) data.endedAt = input.endedAt ? new Date(input.endedAt) : null

  if (input.answers) {
    const merged = mergeAnswers(readAnswers(interview.answers), input.answers)
    data.answers = merged
  }

  const updated = await prisma.prospectionInterview.update({
    where: { id },
    data,
    include: interviewInclude,
  })
  return publicView(updated)
}

export async function appendTranscript(
  actor: Actor,
  id: string,
  input: AppendProspectionTranscriptInput,
) {
  const interview = await loadOwned(actor, id, true)
  assertConsent(interview)

  const previous = interview.transcript ?? ''
  const nextText = input.replace
    ? input.text.trim()
    : `${previous}${previous && !previous.endsWith('\n') ? '\n' : ''}${input.text.trim()}`

  const segments = input.segments
    ? [
        ...readSegments(interview.transcriptSegments),
        ...input.segments.map((s) => ({ text: s.text, at: s.at ?? null })),
      ].slice(-2000)
    : readSegments(interview.transcriptSegments)

  const updated = await prisma.prospectionInterview.update({
    where: { id },
    data: {
      transcript: nextText.slice(0, 200_000),
      transcriptSource: input.source,
      transcriptSegments: segments.length > 0 ? segments : undefined,
      status: interview.status === 'EN_COURS' ? 'A_TRANSCRIRE' : interview.status,
    },
    include: interviewInclude,
  })
  return publicView(updated)
}

export async function attachAudio(
  actor: Actor,
  id: string,
  file: { buffer: Buffer; mimeType: string },
) {
  const interview = await loadOwned(actor, id, true)
  assertConsent(interview)

  if (!file.buffer.length) {
    throw new AppError('PROSPECTION_AUDIO_EMPTY', 400, { message: 'Fichier audio vide' })
  }
  const ext = AUDIO_EXT[file.mimeType] ?? 'bin'
  const key = `prospection/${id}/audio-${Date.now()}.${ext}`
  await uploadToR2(key, file.buffer, file.mimeType || 'application/octet-stream')

  const updated = await prisma.prospectionInterview.update({
    where: { id },
    data: {
      audioKey: key,
      audioMimeType: file.mimeType || null,
      audioSizeBytes: file.buffer.length,
      status: interview.status === 'EN_COURS' ? 'A_TRANSCRIRE' : interview.status,
    },
    include: interviewInclude,
  })
  return publicView(updated)
}

export async function getAudio(actor: Actor, id: string) {
  const interview = await loadOwned(actor, id)
  if (!interview.audioKey) {
    throw new AppError('PROSPECTION_AUDIO_NOT_FOUND', 404, { message: 'Aucun audio pour cet entretien' })
  }
  const buffer = await downloadFromR2(interview.audioKey)
  return { buffer, mimeType: interview.audioMimeType ?? 'application/octet-stream' }
}

export async function requestExtraction(actor: Actor, id: string) {
  const interview = await loadOwned(actor, id, true)
  assertConsent(interview)
  if (!interview.transcript || interview.transcript.trim().length < 20) {
    throw new AppError('PROSPECTION_TRANSCRIPT_MISSING', 409, {
      message: 'Ajoutez d’abord une transcription exploitable de l’entretien.',
    })
  }
  await enqueue('PROSPECTION_EXTRACT', { interviewId: id })
  return { queued: true }
}

/** Appelé par le handler de queue PROSPECTION_EXTRACT. */
export async function runExtraction(interviewId: string, logger: Logger) {
  const interview = await prisma.prospectionInterview.findUnique({ where: { id: interviewId } })
  if (!interview) throw new AppError('PROSPECTION_INTERVIEW_NOT_FOUND', 404, { message: 'Entretien introuvable' })
  if (!interview.transcript) return

  const extraction = await extractInterviewAnswers(
    interview.transcript,
    PROSPECTION_SCRIPT.map((q) => ({ id: q.id, label: q.label })),
    logger,
  )
  if (!extraction) {
    logger.warn({ event: 'PROSPECTION_EXTRACT_SKIPPED', interviewId }, 'Extraction indisponible (Gemini non configuré ou en échec)')
    return
  }

  // L'IA ne remplace jamais une réponse saisie à la main ou issue de la dictée.
  const current = readAnswers(interview.answers)
  const iaAnswers: Record<string, ProspectionAnswerValue> = {}
  for (const [qid, text] of Object.entries(extraction.answers)) {
    if (current[qid]) continue
    iaAnswers[qid] = { text, source: 'IA' }
  }
  const merged = mergeAnswers(current, iaAnswers)

  const notes = extraction.summary
    ? `${interview.notes ? `${interview.notes}\n\n` : ''}— Synthèse IA —\n${extraction.summary}`
    : interview.notes

  await prisma.prospectionInterview.update({
    where: { id: interviewId },
    data: {
      answers: merged as unknown as Prisma.InputJsonValue,
      notes: notes ?? undefined,
      status: interview.status === 'EXPLOITE' ? interview.status : 'TRANSCRIT',
    },
  })
  logger.info(
    { event: 'PROSPECTION_EXTRACT_DONE', interviewId, extracted: Object.keys(iaAnswers).length },
    'Réponses d’entretien extraites',
  )
}

/**
 * Reporte les réponses de l'entretien sur la fiche prospect (VendorContact).
 * Nécessite un prospect rattaché.
 */
export async function applyInterview(
  actor: Actor,
  id: string,
  input: ApplyProspectionInterviewInput,
) {
  const interview = await loadOwned(actor, id, true)
  if (!interview.prospectId) {
    throw new AppError('PROSPECTION_NO_PROSPECT', 409, {
      message: 'Rattachez un prospect à l’entretien pour reporter les réponses.',
    })
  }

  const answers = readAnswers(interview.answers)
  const prospect = await prisma.vendorContact.findUnique({ where: { id: interview.prospectId } })
  if (!prospect) throw new AppError('PROSPECT_NOT_FOUND', 404, { message: 'Prospect introuvable' })

  const data: Record<string, unknown> = {}
  const notesLines: string[] = []

  for (const q of PROSPECTION_SCRIPT) {
    const answer = answers[q.id]?.text?.trim()
    if (!answer || !q.target) continue

    if (q.target === 'pieces') {
      const tags = answer
        .split(/[,;/·]| et /i)
        .map((t) => t.trim())
        .filter((t) => t.length > 1 && t.length < 40)
      const next = input.overwrite ? tags : Array.from(new Set([...prospect.pieces, ...tags]))
      data.pieces = next.slice(0, 40)
    } else if (q.target === 'shopName' || q.target === 'commune' || q.target === 'address') {
      if (input.overwrite || !prospect[q.target]) data[q.target] = answer.slice(0, 255)
    } else {
      // remarques, piecesLibre, notesAppel : on accumule des lignes préfixées.
      notesLines.push(`${(q.label.split(':')[0] ?? q.label).trim()} → ${answer}`)
    }
  }

  if (notesLines.length > 0) {
    const block = `— Entretien du ${new Date(interview.createdAt).toLocaleDateString('fr-FR')} —\n${notesLines.join('\n')}`
    data.remarques = input.overwrite
      ? block
      : `${prospect.remarques ? `${prospect.remarques}\n\n` : ''}${block}`
  }

  await prisma.$transaction([
    prisma.vendorContact.update({ where: { id: prospect.id }, data }),
    prisma.contactActivity.create({
      data: {
        contactId: prospect.id,
        authorId: actor.userId,
        type: 'NOTE',
        note: `Entretien de démarchage exploité (${Object.keys(answers).length} réponse(s)).`,
      },
    }),
    prisma.prospectionInterview.update({ where: { id }, data: { status: 'EXPLOITE' } }),
  ])

  await recordActivity({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'PROSPECTION_INTERVIEW_APPLIED',
    targetType: 'ProspectionInterview',
    targetId: id,
    payload: { prospectId: prospect.id, fields: Object.keys(data) },
  })

  return getInterview(actor, id)
}

// --- helpers ----------------------------------------------------------------

function readAnswers(value: unknown): Record<string, ProspectionAnswerValue> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, ProspectionAnswerValue> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v && typeof v === 'object' && typeof (v as { text?: unknown }).text === 'string') {
      const source = (v as { source?: unknown }).source
      out[k] = {
        text: (v as { text: string }).text,
        source: source === 'IA' || source === 'TRANSCRIPTION' ? source : 'MANUEL',
      }
    }
  }
  return out
}

function mergeAnswers(
  base: Record<string, ProspectionAnswerValue>,
  patch: Record<string, ProspectionAnswerValue>,
): Record<string, ProspectionAnswerValue> {
  const entries = new Map<string, ProspectionAnswerValue>(Object.entries(base))
  for (const [k, v] of Object.entries(patch)) {
    if (!v || typeof v.text !== 'string') continue
    // Réponse vidée → on retire la clé.
    if (v.text.trim().length === 0) {
      entries.delete(k)
      continue
    }
    entries.set(k, { text: v.text.slice(0, 4000), source: v.source ?? 'MANUEL' })
  }
  return Object.fromEntries(entries)
}

function readSegments(value: unknown): Array<{ text: string; at: number | null }> {
  if (!Array.isArray(value)) return []
  return value
    .filter((s): s is { text: string; at?: number | null } => Boolean(s) && typeof s.text === 'string')
    .map((s) => ({ text: s.text, at: typeof s.at === 'number' ? s.at : null }))
}

type InterviewRow = Awaited<ReturnType<typeof loadOwned>>

function publicView(interview: InterviewRow) {
  return {
    id: interview.id,
    status: interview.status,
    prospect: interview.prospect,
    vendor: interview.vendor,
    conductedBy: interview.conductedBy,
    consent: interview.consentGivenAt
      ? {
          givenAt: interview.consentGivenAt,
          method: interview.consentMethod,
          scriptText: interview.consentScriptText,
        }
      : null,
    audio: interview.audioKey
      ? {
          mimeType: interview.audioMimeType,
          durationSec: interview.audioDurationSec,
          sizeBytes: interview.audioSizeBytes,
        }
      : null,
    transcript: interview.transcript,
    transcriptSource: interview.transcriptSource,
    answers: readAnswers(interview.answers),
    notes: interview.notes,
    startedAt: interview.startedAt,
    endedAt: interview.endedAt,
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
  }
}
