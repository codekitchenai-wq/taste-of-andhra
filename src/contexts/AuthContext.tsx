import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authService from '@/services/authService'
import type {
  LoginInput,
  SendOtpInput,
  UpdateProfileInput,
  VerifyOtpInput,
} from '@/services/authService'
import { isSupabaseConfigured, supabase } from '@/services/supabaseClient'
import type { ServiceResponse } from '@/types/api'
import type { Profile } from '@/types/Profile'
import type { UserRole } from '@/types/enums'

export interface AuthContextValue {
  user: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  role: UserRole | null
  /** Admin email/password login */
  login: (input: LoginInput) => Promise<ServiceResponse<Profile>>
  sendOtp: (input: SendOtpInput) => Promise<ServiceResponse<null>>
  verifyOtp: (input: VerifyOtpInput) => Promise<ServiceResponse<Profile>>
  logout: () => Promise<ServiceResponse<null>>
  updateProfile: (input: UpdateProfileInput) => Promise<ServiceResponse<Profile>>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const result = await authService.getCurrentUser()

    if (result.success) {
      setUser(result.data)
    } else {
      setUser(null)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    let mounted = true

    if (!isSupabaseConfigured) {
      setUser(null)
      setIsLoading(false)
      return
    }

    const initialize = async () => {
      await loadUser()
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (mounted) {
        setIsLoading(true)
        void loadUser()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadUser])

  const login = useCallback(async (input: LoginInput) => {
    const result = await authService.login(input)

    if (result.success) {
      setUser(result.data)
    }

    return result
  }, [])

  const sendOtp = useCallback(async (input: SendOtpInput) => {
    return authService.sendPhoneOtp(input)
  }, [])

  const verifyOtp = useCallback(async (input: VerifyOtpInput) => {
    const result = await authService.verifyPhoneOtp(input)

    if (result.success) {
      setUser(result.data)
    }

    return result
  }, [])

  const logout = useCallback(async () => {
    const result = await authService.logout()

    if (result.success) {
      setUser(null)
    }

    return result
  }, [])

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const result = await authService.updateProfile(input)

    if (result.success) {
      setUser(result.data)
    }

    return result
  }, [])

  const refreshUser = useCallback(async () => {
    await loadUser()
  }, [loadUser])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      role: user?.role ?? null,
      login,
      sendOtp,
      verifyOtp,
      logout,
      updateProfile,
      refreshUser,
    }),
    [
      user,
      isLoading,
      login,
      sendOtp,
      verifyOtp,
      logout,
      updateProfile,
      refreshUser,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
