import { createContext, useMemo, type ReactNode } from 'react'
import type { Profile } from '@/types/Profile'
import type { UserRole } from '@/types/enums'

export interface AuthContextValue {
  user: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  role: UserRole | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const value = useMemo<AuthContextValue>(
    () => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      role: null,
    }),
    [],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
