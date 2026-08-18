import { useLocation } from 'react-router-dom'
import { ROUTES } from '@/constants/ROUTES'

/** True on the public home / landing route only. */
export function useIsLandingPage() {
  const { pathname } = useLocation()
  return pathname === ROUTES.HOME
}
