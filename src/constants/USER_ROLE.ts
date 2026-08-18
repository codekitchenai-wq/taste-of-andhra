import type { UserRole } from '@/types/enums'

export const USER_ROLE: Record<UserRole, string> = {
  customer: 'Customer',
  admin: 'Admin',
  delivery: 'Delivery Partner',
  platform_master: 'DirectApp Master',
}
