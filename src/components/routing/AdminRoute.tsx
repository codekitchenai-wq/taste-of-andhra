import { OrgStaffRoute } from '@/components/routing/OrgStaffRoute'
import { ROUTES } from '@/constants/ROUTES'

export function AdminRoute() {
  return <OrgStaffRoute requiredRole="admin" loginTo={ROUTES.ADMIN.LOGIN} />
}
