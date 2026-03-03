'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { LoginModal } from './login-modal'

interface AuthGateProps {
  children: (onClick: () => void) => React.ReactNode
  onAuthenticated: () => void
}

export function AuthGate({ children, onAuthenticated }: AuthGateProps) {
  const { isAuthenticated, refreshProfile } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  const handleClick = useCallback(() => {
    if (isAuthenticated) {
      onAuthenticated()
    } else {
      setShowLogin(true)
    }
  }, [isAuthenticated, onAuthenticated])

  const handleLoginSuccess = useCallback(async () => {
    setShowLogin(false)
    await refreshProfile()
    onAuthenticated()
  }, [refreshProfile, onAuthenticated])

  return (
    <>
      {children(handleClick)}
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onAuthenticated={handleLoginSuccess}
      />
    </>
  )
}
