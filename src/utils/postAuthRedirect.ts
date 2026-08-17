import { AUTH_ADDRESS_SETUP_SEARCH } from '@/constants/AUTH'
import { ROUTES } from '@/constants/ROUTES'
import * as addressService from '@/services/addressService'

function pathnameOf(path: string): string {
  const trimmed = path.trim() || ROUTES.HOME
  return trimmed.split('?')[0] || ROUTES.HOME
}

/**
 * Checkout and cart already collect an address, so do not divert first-time
 * customers to the saved-address setup screen.
 */
export function skipsAddressSetup(intendedPath: string): boolean {
  const path = pathnameOf(intendedPath)

  return (
    path === ROUTES.CHECKOUT ||
    path === ROUTES.CART ||
    path === ROUTES.ONAM ||
    path === ROUTES.ADDRESSES ||
    path === ROUTES.ORDER_SUCCESS ||
    path === ROUTES.ORDERS ||
    path.startsWith(`${ROUTES.ORDERS}/`)
  )
}

export function customerDestinationAfterAuth(
  intendedPath: string,
  addressCount: number,
): string {
  const intended = intendedPath.trim() || ROUTES.HOME

  if (addressCount > 0 || skipsAddressSetup(intended)) {
    return intended
  }

  return `${ROUTES.ADDRESSES}?${AUTH_ADDRESS_SETUP_SEARCH}`
}

export function isAddressSetupPath(path: string): boolean {
  return path.includes(`${ROUTES.ADDRESSES}?${AUTH_ADDRESS_SETUP_SEARCH}`)
}

/** First-time customers (no saved address) go to address setup unless checkout needs them. */
export async function resolveCustomerPostAuthRedirect(
  intendedPath: string,
): Promise<string> {
  if (skipsAddressSetup(intendedPath)) {
    return intendedPath.trim() || ROUTES.HOME
  }

  const result = await addressService.getAddresses()
  const count = result.success ? result.data.length : 0
  return customerDestinationAfterAuth(intendedPath, count)
}
