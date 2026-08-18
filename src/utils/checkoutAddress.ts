export const CHECKOUT_ADDRESS_STORAGE_KEY = 'toa_checkout_address_id'

export function readCheckoutAddressId(): string | null {
  try {
    const value = sessionStorage.getItem(CHECKOUT_ADDRESS_STORAGE_KEY)
    return value?.trim() || null
  } catch {
    return null
  }
}

export function writeCheckoutAddressId(addressId: string) {
  try {
    sessionStorage.setItem(CHECKOUT_ADDRESS_STORAGE_KEY, addressId)
  } catch {
    // ignore
  }
}

export function clearCheckoutAddressId() {
  try {
    sessionStorage.removeItem(CHECKOUT_ADDRESS_STORAGE_KEY)
  } catch {
    // ignore
  }
}
