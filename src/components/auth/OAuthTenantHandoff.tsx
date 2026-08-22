import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  applySessionFromUrlHash,
  continueGoogleOAuthFromPreflight,
  handoffOAuthSessionToTenantIfNeeded,
} from '@/utils/oauthHandoff'
import { shouldContinueGoogleOAuth } from '@/utils/oauthRedirect'

/**
 * Completes the cross-origin Google OAuth hop:
 * preflight → Google → platform host → restaurant host with session hash.
 */
export function OAuthTenantHandoff() {
  const { refreshUser, isAuthenticated, isLoading } = useAuth()
  const hashApplied = useRef(false)
  const googleStarted = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const run = async () => {
      if (shouldContinueGoogleOAuth(window.location.search)) {
        if (googleStarted.current) return
        googleStarted.current = true
        const errorMessage = await continueGoogleOAuthFromPreflight()
        if (errorMessage) {
          googleStarted.current = false
          toast.error('Unable to start Google sign-in. Please try again.')
        }
        return
      }

      // Hop to the restaurant before consuming tokens on www / Taste of Andhra.
      const handedOff = await handoffOAuthSessionToTenantIfNeeded()
      if (handedOff) return

      if (!hashApplied.current) {
        const applied = await applySessionFromUrlHash()
        if (applied) {
          hashApplied.current = true
          await refreshUser()
        }
      }
    }

    void run()
  }, [refreshUser, isAuthenticated, isLoading])

  return null
}
