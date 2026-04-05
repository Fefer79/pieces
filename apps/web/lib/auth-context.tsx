'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

export interface UserProfile {
  id: string
  phone: string | null
  email: string | null
  roles: string[]
  activeContext: string | null
  consentedAt: string | null
}

interface AuthContextValue {
  user: UserProfile | null
  isAuthenticated: boolean
  loading: boolean
  login: (returnTo?: string) => void
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authDebug, setAuthDebug] = useState('')

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  }, [])

  const refreshProfile = useCallback(async (accessToken?: string) => {
    try {
      const token = accessToken ?? await getAccessToken()
      if (!token) {
        setUser(null)
        return
      }

      const res = await fetch('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        setUser(null)
        return
      }

      const body = await res.json()
      setUser(body.data)
    } catch {
      setUser(null)
    }
  }, [getAccessToken])

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const token = await getAccessToken()
        if (!token) {
          if (!cancelled) {
            setAuthDebug('no token from getSession')
            setLoading(false)
          }
          return
        }

        const res = await fetch('/api/v1/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const body = await res.json()
          if (!cancelled) setUser(body.data)
        } else {
          const text = await res.text()
          if (!cancelled) setAuthDebug(`/users/me ${res.status}: ${text.slice(0, 200)}`)
        }
      } catch (err) {
        if (!cancelled) setAuthDebug(`init error: ${err}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    const supabase = getSupabase()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        refreshProfile(session?.access_token).then(() => setLoading(false))
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [getAccessToken, refreshProfile])

  const login = useCallback((returnTo?: string) => {
    if (returnTo) {
      sessionStorage.setItem('auth_return_to', returnTo)
    }
    router.push('/login')
  }, [router])

  const logout = useCallback(async () => {
    await getSupabase().auth.signOut()
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        refreshProfile,
        getAccessToken,
      }}
    >
      {authDebug && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#fee', color: '#900', padding: '8px 12px', fontSize: 12, fontFamily: 'monospace' }}>
          AUTH DEBUG: {authDebug}
        </div>
      )}
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  // eslint-disable-next-line no-restricted-syntax
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
