import { createClient } from '@supabase/supabase-js'
import { apiEnvSchema } from 'shared/env'

const env = apiEnvSchema.parse(process.env)

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
