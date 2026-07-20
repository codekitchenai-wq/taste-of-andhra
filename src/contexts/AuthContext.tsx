import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authService from '@/services/authService'
import type { LoginInput, RegisterInput } from '@/services/authService'
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
  logout: () => Promise<ServiceResponse<null>>
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
    const result = await authService.registerCustomer(input)

    if (result.success && result.data.id) {
      const sessionResult = await authService.getCurrentUser()
      if (sessionResult.success && sessionResult.data) {
        setUser(sessionResult.data)
      }
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      role: user?.role ?? null,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
