import { supabaseAdmin } from '../../lib/supabase.js'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { sendOtpSchema, verifyOtpSchema } from 'shared/validators'

export async function sendOtp(input: { phone?: string; email?: string }) {
  const parsed = sendOtpSchema.safeParse(input)
  if (!parsed.success) {
    throw new AppError('AUTH_INVALID_INPUT', 400, { message: parsed.error.issues[0]?.message })
  }

  const { phone, email } = parsed.data
  if (!phone && !email) {
    throw new AppError('AUTH_INVALID_INPUT', 400, { message: 'phone or email required' })
  }
  const otpPayload = phone ? { phone } : { email: email as string }

  const { error } = await supabaseAdmin.auth.signInWithOtp(otpPayload)

  if (error) {
    throw new AppError('AUTH_OTP_SEND_FAILED', 500, { message: error.message })
  }

  return { sent: true }
}

export async function verifyOtp(input: { phone?: string; email?: string; token: string }) {
  const parsed = verifyOtpSchema.safeParse(input)
  if (!parsed.success) {
    throw new AppError('AUTH_INVALID_INPUT', 400, { message: parsed.error.issues[0]?.message })
  }

  const { phone, email, token } = parsed.data
  if (!phone && !email) {
    throw new AppError('AUTH_INVALID_INPUT', 400, { message: 'phone or email required' })
  }
  const isPhone = !!phone
  const verifyPayload = isPhone
    ? { phone: phone as string, token, type: 'sms' as const }
    : { email: email as string, token, type: 'email' as const }

  const { data, error } = await supabaseAdmin.auth.verifyOtp(verifyPayload)

  if (error) {
    if (error.message.includes('expired')) {
      throw new AppError('AUTH_EXPIRED_OTP', 400, { message: error.message })
    }
    throw new AppError('AUTH_INVALID_OTP', 400, { message: error.message })
  }

  if (!data.user || !data.session) {
    throw new AppError('AUTH_INVALID_OTP', 400)
  }

  const upsertData = isPhone
    ? { phone: phone as string, email: data.user.email ?? undefined }
    : { email: email as string, phone: data.user.phone ?? undefined }

  const user = await prisma.user.upsert({
    where: { supabaseId: data.user.id },
    update: {
      ...(upsertData.phone && { phone: upsertData.phone }),
      ...(upsertData.email && { email: upsertData.email }),
    },
    create: {
      supabaseId: data.user.id,
      phone: upsertData.phone ?? null,
      email: upsertData.email ?? null,
      roles: ['OWNER'],
    },
  })

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      roles: user.roles,
    },
  }
}
