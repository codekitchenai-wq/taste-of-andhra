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
  const { refreshUser } = useAuth()
  const started = useRef(false)

  useEffect(() => {
    if (started.current || typeof window === 'undefined') return
    started.current = true

    const run = async () => {
      const applied = await applySessionFromUrlHash()
      if (applied) {
        await refreshUser()
        return
      }

      if (shouldContinueGoogleOAuth(window.location.search)) {
        const errorMessage = await continueGoogleOAuthFromPreflight()
        if (errorMessage) {
          toast.error('Unable to start Google sign-in. Please try again.')
        }
        return
      }

      const handedOff = await handoffOAuthSessionToTenantIfNeeded()
      if (handedOff) return
    }

    void run()
  }, [refreshUser])

  return null
}
