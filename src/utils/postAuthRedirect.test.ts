import { describe, expect, it } from 'vitest'
import { AUTH_ADDRESS_SETUP_SEARCH } from '@/constants/AUTH'
import { ROUTES } from '@/constants/ROUTES'
import {
  customerDestinationAfterAuth,
  isAddressSetupPath,
  skipsAddressSetup,
} from './postAuthRedirect'

describe('skipsAddressSetup', () => {
  it('skips checkout, cart, and existing address pages', () => {
    expect(skipsAddressSetup(ROUTES.CHECKOUT)).toBe(true)
    expect(skipsAddressSetup(ROUTES.CART)).toBe(true)
    expect(skipsAddressSetup(ROUTES.ONAM)).toBe(true)
    expect(skipsAddressSetup(ROUTES.ADDRESSES)).toBe(true)
    expect(skipsAddressSetup(ROUTES.ORDERS)).toBe(true)
    expect(skipsAddressSetup(ROUTES.ORDER_DETAILS('abc'))).toBe(true)
  })

  it('does not skip home or menu', () => {
    expect(skipsAddressSetup(ROUTES.HOME)).toBe(false)
    expect(skipsAddressSetup(ROUTES.MENU)).toBe(false)
  })
})

describe('customerDestinationAfterAuth', () => {
  it('sends first-time customers to address setup', () => {
    expect(customerDestinationAfterAuth(ROUTES.HOME, 0)).toBe(
      `${ROUTES.ADDRESSES}?${AUTH_ADDRESS_SETUP_SEARCH}`,
    )
    expect(isAddressSetupPath(customerDestinationAfterAuth('/', 0))).toBe(true)
  })

  it('keeps returning customers on their intended page', () => {
    expect(customerDestinationAfterAuth(ROUTES.MENU, 2)).toBe(ROUTES.MENU)
  })

  it('does not divert when checkout already needs an address', () => {
    expect(customerDestinationAfterAuth(ROUTES.CHECKOUT, 0)).toBe(ROUTES.CHECKOUT)
  })
})
