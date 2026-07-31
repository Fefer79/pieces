// Intégration CinetPay — passerelle mobile money unique pour la Côte d'Ivoire
// (Orange Money, MTN MoMo, Moov Money, Wave). Sans credentials, le module
// tourne en mode bouchon : init simulé, vérification impossible (fail-closed).

const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID

/** Opérateurs mobile money encaissés en Côte d'Ivoire. */
export type MobileMoneyOperator = 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'WAVE'

export const MOBILE_MONEY_OPERATORS: MobileMoneyOperator[] = [
  'ORANGE_MONEY',
  'MTN_MOMO',
  'MOOV_MONEY',
  'WAVE',
]

/**
 * Rapprochement du code opérateur renvoyé par CinetPay (`payment_method` de
 * /v2/payment/check) vers notre enum. La casse et les suffixes varient selon
 * les intégrations, d'où la normalisation par préfixe plutôt qu'une table
 * d'égalités stricte.
 */
export function operatorFromCinetPayMethod(method: string | undefined): MobileMoneyOperator | null {
  if (!method) return null
  const m = method.toUpperCase().replace(/[^A-Z]/g, '')
  if (m.startsWith('OM') || m.includes('ORANGE')) return 'ORANGE_MONEY'
  if (m.startsWith('MOMO') || m.includes('MTN')) return 'MTN_MOMO'
  if (m.includes('FLOOZ') || m.includes('MOOV')) return 'MOOV_MONEY'
  if (m.includes('WAVE')) return 'WAVE'
  return null
}

/**
 * CinetPay refuse les montants XOF qui ne sont pas multiples de 5. On arrondit
 * au multiple supérieur — jamais à la baisse, ce serait encaisser moins que dû.
 */
export function roundToXofStep(amount: number): number {
  return Math.ceil(amount / 5) * 5
}

export interface PaymentInitResult {
  transactionId: string
  paymentUrl: string | null
  status: 'pending' | 'error'
  /** Message d'erreur CinetPay, à journaliser côté appelant. */
  error?: string
}

export interface CinetPayInitParams {
  /** Référence unique côté Pièces — sert de clé de rapprochement au webhook. */
  transactionId: string
  amount: number
  description: string
  customerPhone: string
  /**
   * `channels` n'accepte que ALL | MOBILE_MONEY | CREDIT_CARD | WALLET : on ne
   * peut pas pré-sélectionner un opérateur précis via l'API. Le choix fait dans
   * notre interface sert au récapitulatif et au rapprochement ; l'opérateur
   * réellement utilisé est relu au webhook.
   */
  channels?: 'ALL' | 'MOBILE_MONEY' | 'CREDIT_CARD' | 'WALLET'
  returnUrl: string
  notifyUrl: string
  /** Renvoyé tel quel par CinetPay — utile pour tracer sans requête en base. */
  metadata?: string
}

/**
 * Initialise un paiement CinetPay. Générique : la référence de transaction est
 * fournie par l'appelant, ce module ne connaît ni les commandes ni les
 * abonnements.
 */
export async function initCinetPayPayment(params: CinetPayInitParams): Promise<PaymentInitResult> {
  if (!CINETPAY_API_KEY || !CINETPAY_SITE_ID) {
    // Mode bouchon (dev/test) : pas d'URL de paiement, l'appelant reste en attente.
    return { transactionId: params.transactionId, paymentUrl: null, status: 'pending' }
  }

  const res = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: params.transactionId,
      amount: roundToXofStep(params.amount),
      currency: 'XOF',
      description: params.description,
      customer_phone_number: params.customerPhone,
      channels: params.channels ?? 'ALL',
      return_url: params.returnUrl,
      notify_url: params.notifyUrl,
      ...(params.metadata ? { metadata: params.metadata } : {}),
    }),
  })

  const data = (await res.json()) as {
    data?: { payment_url?: string }
    code?: string
    message?: string
    description?: string
  }

  if (data.code === '201' && data.data?.payment_url) {
    return { transactionId: params.transactionId, paymentUrl: data.data.payment_url, status: 'pending' }
  }

  return {
    transactionId: params.transactionId,
    paymentUrl: null,
    status: 'error',
    error: data.description ?? data.message ?? `CinetPay code ${data.code ?? '?'}`,
  }
}

/**
 * Init d'un paiement de commande. Conserve le format de référence historique
 * `pieces_{orderId}_{timestamp}` — le webhook en production s'appuie dessus.
 */
export async function initPayment(params: {
  amount: number
  orderId: string
  description: string
  customerPhone: string
  paymentMethod: string
}): Promise<PaymentInitResult> {
  return initCinetPayPayment({
    transactionId: `pieces_${params.orderId}_${Date.now()}`,
    amount: params.amount,
    description: params.description,
    customerPhone: params.customerPhone,
    channels: params.paymentMethod === 'COD' ? 'ALL' : 'MOBILE_MONEY',
    returnUrl: `${process.env.NEXT_PUBLIC_URL ?? 'https://pieces.ci'}/orders/success`,
    notifyUrl: `${process.env.API_URL ?? 'https://api.pieces.ci'}/api/v1/webhooks/cinetpay`,
  })
}

export interface CinetPayVerification {
  status: string
  amount: number
  /** Code opérateur brut (OM, MOMO, FLOOZ, WAVECI…) tel que renvoyé par CinetPay. */
  paymentMethod?: string
}

/**
 * Vérifie l'authenticité d'une transaction auprès de CinetPay (source de vérité).
 * On NE FAIT JAMAIS confiance au payload du webhook : on rappelle l'API
 * `/v2/payment/check` avec nos credentials pour confirmer statut + montant réels.
 * Renvoie null si la vérification est impossible (credentials absents ou
 * transaction inconnue) → le webhook doit alors être rejeté (fail-closed).
 */
export async function verifyCinetPayTransaction(
  transactionId: string,
): Promise<CinetPayVerification | null> {
  if (!CINETPAY_API_KEY || !CINETPAY_SITE_ID) {
    // Pas de credentials → on ne peut pas authentifier l'appel. Fail-closed.
    return null
  }

  const res = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: transactionId,
    }),
  })

  const data = (await res.json()) as {
    code?: string
    data?: { status?: string; amount?: number | string; payment_method?: string }
  }

  // code '00' = requête de vérification réussie ; data.status porte l'état réel.
  if (data.code !== '00' || !data.data) {
    return null
  }

  return {
    status: data.data.status ?? '',
    amount: Number(data.data.amount ?? 0),
    paymentMethod: data.data.payment_method,
  }
}
