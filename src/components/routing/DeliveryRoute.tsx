import { OrgStaffRoute } from '@/components/routing/OrgStaffRoute'
import { ROUTES } from '@/constants/ROUTES'

export function DeliveryRoute() {
  return (
    <OrgStaffRoute requiredRole="delivery" loginTo={ROUTES.DELIVERY.LOGIN} />
  )
}
