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
  RegisterInput,
  UpdateProfileInput,
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
  login: (input: LoginInput) => Promise<ServiceResponse<Profile>>
  register: (input: RegisterInput) => Promise<ServiceResponse<Profile>>
  loginWithGoogle: (redirectPath?: string) => Promise<ServiceResponse<null>>
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

  const register = useCallback(async (input: RegisterInput) => {
    const result = await authService.register(input)

    if (result.success) {
      setUser(result.data)
    }

    return result
  }, [])

  const loginWithGoogle = useCallback(async (redirectPath?: string) => {
    return authService.loginWithGoogle(redirectPath)
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
      register,
      loginWithGoogle,
      logout,
      updateProfile,
      refreshUser,
    }),
    [
      user,
      isLoading,
      login,
      register,
      loginWithGoogle,
      logout,
      updateProfile,
      refreshUser,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
