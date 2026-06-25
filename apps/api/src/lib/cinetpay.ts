// CinetPay integration stub for MVP
// Real integration requires API key and site ID from CinetPay dashboard

const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID

export interface PaymentInitResult {
  transactionId: string
  paymentUrl: string | null
  status: 'pending' | 'error'
}

export async function initPayment(params: {
  amount: number
  orderId: string
  description: string
  customerPhone: string
  paymentMethod: string
}): Promise<PaymentInitResult> {
  if (!CINETPAY_API_KEY || !CINETPAY_SITE_ID) {
    // Stub mode: simulate successful payment init
    return {
      transactionId: `txn_${params.orderId}_${Date.now()}`,
      paymentUrl: null,
      status: 'pending',
    }
  }

  // Real CinetPay API call would go here
  const res = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: `pieces_${params.orderId}_${Date.now()}`,
      amount: params.amount,
      currency: 'XOF',
      description: params.description,
      customer_phone_number: params.customerPhone,
      channels: params.paymentMethod === 'ORANGE_MONEY' ? 'ORANGE_CI' : params.paymentMethod === 'MTN_MOMO' ? 'MTN_CI' : 'ALL',
      return_url: `${process.env.NEXT_PUBLIC_URL ?? 'https://pieces.ci'}/orders/success`,
      notify_url: `${process.env.API_URL ?? 'https://api.pieces.ci'}/api/v1/webhooks/cinetpay`,
    }),
  })

  const data = (await res.json()) as { data?: { payment_url?: string }; code?: string }

  if (data.code === '201') {
    return {
      transactionId: `pieces_${params.orderId}_${Date.now()}`,
      paymentUrl: data.data?.payment_url ?? null,
      status: 'pending',
    }
  }

  return { transactionId: '', paymentUrl: null, status: 'error' }
}

export interface CinetPayVerification {
  status: string
  amount: number
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
    data?: { status?: string; amount?: number | string }
  }

  // code '00' = requête de vérification réussie ; data.status porte l'état réel.
  if (data.code !== '00' || !data.data) {
    return null
  }

  return {
    status: data.data.status ?? '',
    amount: Number(data.data.amount ?? 0),
  }
}
