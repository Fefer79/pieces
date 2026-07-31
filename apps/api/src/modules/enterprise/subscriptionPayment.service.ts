import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { assertMember } from './enterprise.service.js'
import { BILLING_ROLES, FINANCE_ROLES } from './roles.js'
import {
  computeMonthlyAmount,
  getCurrentSubscription,
  SUBSCRIPTION_CONSTANTS,
  type BillingCycle,
  type SubscriptionTier,
} from './subscription.service.js'
import {
  initCinetPayPayment,
  operatorFromCinetPayMethod,
  roundToXofStep,
  type MobileMoneyOperator,
} from '../../lib/cinetpay.js'

/**
 * Préfixe de référence des paiements d'abonnement. Le webhook CinetPay est
 * partagé avec les commandes (`pieces_{orderId}_{ts}`) : c'est ce préfixe qui
 * décide vers quel domaine router la confirmation. Ne jamais le réutiliser.
 */
export const SUBSCRIPTION_TX_PREFIX = 'piecesabo'

/** `piecesabo_{paymentId}_{timestamp}` → paymentId, ou null si ce n'est pas un abonnement. */
export function paymentIdFromTransactionId(transactionId: string): string | null {
  if (!transactionId.startsWith(`${SUBSCRIPTION_TX_PREFIX}_`)) return null
  const id = transactionId.slice(SUBSCRIPTION_TX_PREFIX.length + 1).split('_')[0]
  return id || null
}

export function isSubscriptionTransaction(transactionId: string): boolean {
  return transactionId.startsWith(`${SUBSCRIPTION_TX_PREFIX}_`)
}

/** Ajoute n mois en calant sur la fin de mois quand le jour n'existe pas (31 → 28/30). */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime())
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d
}

export interface SubscriptionQuote {
  tier: SubscriptionTier
  billingCycle: BillingCycle
  vehicleCount: number
  pricePerVehicle: number
  monthsBilled: number
  /** Montant réellement appelé, arrondi au pas XOF de CinetPay. */
  amount: number
  periodStart: Date
  periodEnd: Date
}

/**
 * Devis d'encaissement : ce que l'entreprise doit payer maintenant, et pour
 * quelle période. La période démarre à la fin de la période déjà réglée (ou de
 * l'essai) quand celle-ci est dans le futur — payer en avance prolonge, ça ne
 * remplace pas.
 */
export async function quoteSubscriptionPayment(
  enterpriseId: string,
  input: { tier: SubscriptionTier; billingCycle: BillingCycle },
  now: Date = new Date(),
): Promise<SubscriptionQuote> {
  if (input.tier === 'FREE') {
    throw new AppError('SUBSCRIPTION_TIER_FREE', 400, {
      message: 'Le niveau Gratuit ne se paie pas',
    })
  }

  const [vehicleCount, sub] = await Promise.all([
    prisma.vehicle.count({ where: { enterpriseId } }),
    getCurrentSubscription(enterpriseId),
  ])

  if (vehicleCount === 0) {
    throw new AppError('SUBSCRIPTION_NO_VEHICLE', 400, {
      message: 'Ajoutez au moins un véhicule avant de payer — le tarif est au véhicule',
    })
  }

  const breakdown = computeMonthlyAmount(input.tier, vehicleCount)
  const monthsBilled =
    input.billingCycle === 'ANNUAL' ? SUBSCRIPTION_CONSTANTS.ANNUAL_MONTHS_BILLED : 1
  const monthsCovered = input.billingCycle === 'ANNUAL' ? 12 : 1
  const raw = input.billingCycle === 'ANNUAL' ? breakdown.annualTotal : breakdown.monthlyTotal

  // Un essai en cours ou une période déjà réglée décale le point de départ :
  // le client ne perd pas les jours qu'il a déjà.
  const candidates = [sub?.currentPeriodEnd, sub?.trialExpired ? null : sub?.trialEndsAt]
    .filter((d): d is Date => d instanceof Date && d.getTime() > now.getTime())
    .map((d) => d.getTime())
  const periodStart = candidates.length > 0 ? new Date(Math.max(...candidates)) : now

  return {
    tier: input.tier,
    billingCycle: input.billingCycle,
    vehicleCount,
    pricePerVehicle: breakdown.pricePerVehicle,
    monthsBilled,
    amount: roundToXofStep(raw),
    periodStart,
    periodEnd: addMonths(periodStart, monthsCovered),
  }
}

/** Devis lisible par tout membre autorisé sur la finance (aucune écriture). */
export async function getQuoteForMember(
  enterpriseId: string,
  userId: string,
  input: { tier: SubscriptionTier; billingCycle: BillingCycle },
) {
  await assertMember(enterpriseId, userId, FINANCE_ROLES)
  return quoteSubscriptionPayment(enterpriseId, input)
}

export interface InitSubscriptionPaymentInput {
  tier: SubscriptionTier
  billingCycle: BillingCycle
  operator: MobileMoneyOperator
  payerPhone: string
}

/**
 * Crée la tentative de paiement puis demande à CinetPay l'URL de règlement.
 *
 * L'enregistrement est écrit AVANT l'appel réseau : si CinetPay répond après un
 * timeout côté client, le webhook doit pouvoir retrouver la ligne. Une ligne
 * PENDING sans URL est un échec d'init, pas un paiement perdu.
 */
export async function initSubscriptionPayment(
  enterpriseId: string,
  userId: string,
  input: InitSubscriptionPaymentInput,
) {
  await assertMember(enterpriseId, userId, BILLING_ROLES)

  const quote = await quoteSubscriptionPayment(enterpriseId, {
    tier: input.tier,
    billingCycle: input.billingCycle,
  })
  const sub = await getCurrentSubscription(enterpriseId)

  const payment = await prisma.subscriptionPayment.create({
    data: {
      enterpriseId,
      subscriptionId: sub?.id ?? null,
      // Référence provisoire : remplacée juste après par une valeur qui porte
      // l'id réel. `transactionId` est unique, on ne peut pas le laisser vide.
      transactionId: `${SUBSCRIPTION_TX_PREFIX}_pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amount: quote.amount,
      tier: quote.tier,
      billingCycle: quote.billingCycle,
      vehicleCount: quote.vehicleCount,
      operator: input.operator,
      payerPhone: input.payerPhone,
      status: 'PENDING',
      periodStart: quote.periodStart,
      periodEnd: quote.periodEnd,
      createdByUserId: userId,
    },
  })

  const transactionId = `${SUBSCRIPTION_TX_PREFIX}_${payment.id}_${Date.now()}`
  await prisma.subscriptionPayment.update({
    where: { id: payment.id },
    data: { transactionId },
  })

  const enterprise = await prisma.enterprise.findUnique({
    where: { id: enterpriseId },
    select: { name: true },
  })

  const webUrl = process.env.NEXT_PUBLIC_URL ?? 'https://pieces.ci'
  const apiUrl = process.env.API_URL ?? 'https://api.pieces.ci'

  const init = await initCinetPayPayment({
    transactionId,
    amount: quote.amount,
    description: `Abonnement Pièces — ${quote.tier === 'PRO_FLOTTE_PLUS' ? 'Flotte Pro +' : 'Flotte Pro'} — ${quote.vehicleCount} véhicule(s) — ${enterprise?.name ?? 'flotte'}`,
    customerPhone: input.payerPhone,
    channels: 'MOBILE_MONEY',
    returnUrl: `${webUrl}/enterprise/billing?paiement=${payment.id}`,
    notifyUrl: `${apiUrl}/api/v1/webhooks/cinetpay`,
    metadata: enterpriseId,
  })

  if (init.status === 'error') {
    const failed = await prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: init.error ?? 'Initialisation refusée' },
    })
    throw new AppError('PAYMENT_INIT_FAILED', 502, {
      message: "Le paiement n'a pas pu être initialisé. Réessayez dans un instant.",
      details: { paymentId: failed.id, reason: init.error },
    })
  }

  const updated = await prisma.subscriptionPayment.update({
    where: { id: payment.id },
    data: { paymentUrl: init.paymentUrl },
  })

  if (sub) {
    await prisma.enterpriseSubscriptionEvent.create({
      data: {
        subscriptionId: sub.id,
        kind: 'PAYMENT_INITIATED',
        payload: {
          paymentId: payment.id,
          amount: quote.amount,
          operator: input.operator,
          cycle: quote.billingCycle,
        },
        actorUserId: userId,
      },
    })
  }

  return { payment: updated, quote }
}

/**
 * Confirme un paiement à partir d'un montant DÉJÀ vérifié auprès de CinetPay,
 * et active (ou prolonge) l'abonnement. Idempotent : un second webhook pour la
 * même transaction ne reprolonge pas la période.
 */
export async function confirmSubscriptionPayment(
  transactionId: string,
  verifiedAmount: number,
  verifiedMethod?: string,
) {
  const payment = await prisma.subscriptionPayment.findUnique({ where: { transactionId } })
  if (!payment) {
    throw new AppError('SUBSCRIPTION_PAYMENT_NOT_FOUND', 404, {
      message: 'Paiement d\'abonnement introuvable',
    })
  }

  // Idempotence : déjà encaissé, on ressort la ligne sans retoucher la période.
  if (payment.status === 'PAID') return payment

  if (verifiedAmount < payment.amount) {
    const failed = await prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failureReason: `Montant insuffisant : ${verifiedAmount} reçu pour ${payment.amount} attendu`,
      },
    })
    throw new AppError('PAYMENT_AMOUNT_MISMATCH', 400, {
      message: 'Montant payé insuffisant pour cet abonnement',
      details: { paymentId: failed.id },
    })
  }

  // La période a pu être calculée à l'init il y a plusieurs jours : si elle est
  // déjà entamée, on repart de maintenant pour ne pas vendre du passé.
  const now = new Date()
  const periodStart = payment.periodStart && payment.periodStart > now ? payment.periodStart : now
  const monthsCovered = payment.billingCycle === 'ANNUAL' ? 12 : 1
  const periodEnd = addMonths(periodStart, monthsCovered)

  const paid = await prisma.subscriptionPayment.update({
    where: { id: payment.id },
    data: {
      status: 'PAID',
      paidAt: now,
      periodStart,
      periodEnd,
      operator: operatorFromCinetPayMethod(verifiedMethod) ?? payment.operator,
    },
  })

  const existing = await getCurrentSubscription(payment.enterpriseId)

  if (existing) {
    await prisma.enterpriseSubscription.update({
      where: { id: existing.id },
      data: {
        tier: payment.tier,
        billingCycle: payment.billingCycle,
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
      },
    })
    await prisma.enterpriseSubscriptionEvent.createMany({
      data: [
        {
          subscriptionId: existing.id,
          kind: 'PAYMENT_RECEIVED',
          payload: { paymentId: paid.id, amount: verifiedAmount, operator: paid.operator },
        },
        {
          subscriptionId: existing.id,
          kind: existing.status === 'ACTIVE' ? 'RENEWED' : 'ACTIVATED',
          payload: { periodEnd: periodEnd.toISOString(), tier: payment.tier },
        },
      ],
    })
    await prisma.subscriptionPayment.update({
      where: { id: paid.id },
      data: { subscriptionId: existing.id },
    })
    return paid
  }

  // Premier paiement sans abonnement en base (essai jamais ouvert) : on crée
  // directement un abonnement actif, sans essai — il vient de payer.
  const created = await prisma.enterpriseSubscription.create({
    data: {
      enterpriseId: payment.enterpriseId,
      tier: payment.tier,
      status: 'ACTIVE',
      billingCycle: payment.billingCycle,
      currentPeriodEnd: periodEnd,
    },
  })
  await prisma.enterpriseSubscriptionEvent.createMany({
    data: [
      {
        subscriptionId: created.id,
        kind: 'CREATED',
        payload: { tier: payment.tier, trial: false, source: 'PAYMENT' },
      },
      {
        subscriptionId: created.id,
        kind: 'PAYMENT_RECEIVED',
        payload: { paymentId: paid.id, amount: verifiedAmount, operator: paid.operator },
      },
      {
        subscriptionId: created.id,
        kind: 'ACTIVATED',
        payload: { periodEnd: periodEnd.toISOString(), tier: payment.tier },
      },
    ],
  })
  return prisma.subscriptionPayment.update({
    where: { id: paid.id },
    data: { subscriptionId: created.id },
  })
}

/** Marque une tentative comme échouée (webhook CinetPay non accepté). */
export async function markSubscriptionPaymentFailed(transactionId: string, reason: string) {
  const payment = await prisma.subscriptionPayment.findUnique({ where: { transactionId } })
  if (!payment || payment.status === 'PAID') return payment
  return prisma.subscriptionPayment.update({
    where: { id: payment.id },
    data: { status: 'FAILED', failureReason: reason },
  })
}

export async function listSubscriptionPayments(enterpriseId: string, userId: string) {
  await assertMember(enterpriseId, userId, FINANCE_ROLES)
  return prisma.subscriptionPayment.findMany({
    where: { enterpriseId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function getSubscriptionPayment(
  enterpriseId: string,
  userId: string,
  paymentId: string,
) {
  await assertMember(enterpriseId, userId, FINANCE_ROLES)
  const payment = await prisma.subscriptionPayment.findUnique({ where: { id: paymentId } })
  // Le contrôle d'appartenance empêche de lire le paiement d'une autre flotte
  // en devinant un uuid depuis un compte légitime (IDOR).
  if (!payment || payment.enterpriseId !== enterpriseId) {
    throw new AppError('SUBSCRIPTION_PAYMENT_NOT_FOUND', 404, { message: 'Paiement introuvable' })
  }
  return payment
}
