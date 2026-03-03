'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ConsentModal } from './consent-modal'
import { AppShell } from '@/components/app-shell'

type SupabaseClient = ReturnType<typeof createClient>

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname.startsWith('/login')

  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [consentChecked, setConsentChecked] = useState(false)
  const [needsConsent, setNeedsConsent] = useState(false)

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  }, [])

  const checkConsent = useCallback(async () => {
    try {
      const token = await getAccessToken()
      if (!token) {
        setConsentChecked(true)
        return
      }

      const res = await fetch('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        setConsentChecked(true)
        return
      }

      const body = await res.json()
      setNeedsConsent(!body.data.consentedAt)
    } catch {
      // On error, don't block
    } finally {
      setConsentChecked(true)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (!isLoginPage) {
      checkConsent()
    }
  }, [isLoginPage, checkConsent])

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <AppShell>
      {children}

      {consentChecked && needsConsent && (
        <ConsentModal
          onConsented={() => setNeedsConsent(false)}
          getAccessToken={getAccessToken}
        />
      )}
    </AppShell>
  )
}
