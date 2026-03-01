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
