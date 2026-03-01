import { supabaseAdmin } from '../../lib/supabase.js'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { phoneSchema, otpSchema } from 'shared/validators'

export async function sendOtp(phone: string) {
  const parsed = phoneSchema.safeParse(phone)
  if (!parsed.success) {
    throw new AppError('AUTH_INVALID_PHONE', 400, { message: parsed.error.issues[0]?.message })
  }

  const { error } = await supabaseAdmin.auth.signInWithOtp({ phone: parsed.data })

  if (error) {
    throw new AppError('AUTH_OTP_SEND_FAILED', 500, { message: error.message })
  }

  return { sent: true }
}

export async function verifyOtp(phone: string, token: string) {
  const parsedPhone = phoneSchema.safeParse(phone)
  if (!parsedPhone.success) {
    throw new AppError('AUTH_INVALID_PHONE', 400, { message: parsedPhone.error.issues[0]?.message })
  }

  const parsedToken = otpSchema.safeParse(token)
  if (!parsedToken.success) {
    throw new AppError('AUTH_INVALID_OTP', 400, { message: parsedToken.error.issues[0]?.message })
  }

  const { data, error } = await supabaseAdmin.auth.verifyOtp({
    phone: parsedPhone.data,
    token: parsedToken.data,
    type: 'sms',
  })

  if (error) {
    if (error.message.includes('expired')) {
      throw new AppError('AUTH_EXPIRED_OTP', 400, { message: error.message })
    }
    throw new AppError('AUTH_INVALID_OTP', 400, { message: error.message })
  }

  if (!data.user || !data.session) {
    throw new AppError('AUTH_INVALID_OTP', 400)
  }

  const user = await prisma.user.upsert({
    where: { supabaseId: data.user.id },
    update: { phone: parsedPhone.data },
    create: {
      supabaseId: data.user.id,
      phone: parsedPhone.data,
      roles: ['MECHANIC'],
    },
  })

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: {
      id: user.id,
      phone: user.phone,
      roles: user.roles,
    },
  }
}
