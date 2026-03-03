'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './auth-context'

export function useRequireAuth() {
  const { user, loading, login } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      login(pathname)
    }
  }, [loading, user, login, pathname])

  return { user, loading }
}
