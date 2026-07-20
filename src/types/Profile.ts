import type { UserRole } from './enums'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
