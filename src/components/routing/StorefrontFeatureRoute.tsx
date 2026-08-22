import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { ROUTES } from '@/constants/ROUTES'
import { useOrganization } from '@/contexts/OrganizationContext'
import {
  storefrontPartyOrdersEnabled,
  storefrontPublicMenuEnabled,
} from '@/utils/storefrontCopy'

/** Blocks /menu routes when the restaurant has public menu disabled. */
export function StorefrontMenuRoute() {
  const org = useOrganization()
  if (org.isLoading) {
    return <LoadingState fullPage variant="inline" />
  }
  if (!storefrontPublicMenuEnabled(org)) {
    return <Navigate to={ROUTES.HOME} replace />
  }
  return <Outlet />
}

/** Blocks /party-order when the restaurant has party orders disabled. */
export function StorefrontPartyOrderRoute() {
  const org = useOrganization()
  if (org.isLoading) {
    return <LoadingState fullPage variant="inline" />
  }
  if (!storefrontPartyOrdersEnabled(org)) {
    return <Navigate to={ROUTES.HOME} replace />
  }
  return <Outlet />
}
