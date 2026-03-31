'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { EnterpriseSidebar } from './_components/enterprise-sidebar'

type SupabaseClient = ReturnType<typeof createClient>
type AccessState = 'loading' | 'authorized' | 'no-role'

function useEnterpriseAccess() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const [accessState, setAccessState] = useState<AccessState>('loading')

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const { data: { session } } = await getSupabase().auth.getSession()

        if (!session) {
          router.replace('/login')
          return
        }

        const res = await fetch('/api/v1/users/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (!res.ok) {
          router.replace('/login')
          return
        }

        const body = await res.json()
        const user = body.data
        const hasEnterprise = user.roles?.includes('ENTERPRISE') || user.activeContext === 'ENTERPRISE'

        if (!cancelled) {
          setAccessState(hasEnterprise ? 'authorized' : 'no-role')
        }
      } catch {
        if (!cancelled) {
          router.replace('/login')
        }
      }
    }

    check()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return accessState
}

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  const state = useEnterpriseAccess()

  if (state === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-sm text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (state === 'no-role') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="mb-2 text-lg font-semibold text-gray-900">Accès réservé aux entreprises</h1>
          <p className="mb-6 text-sm text-gray-500">
            Ce tableau de bord est réservé aux comptes entreprise. Contactez-nous pour obtenir un accès.
          </p>
          <Link
            href="/browse"
            className="inline-block rounded-lg bg-[#002366] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Retour au site
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <EnterpriseSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
