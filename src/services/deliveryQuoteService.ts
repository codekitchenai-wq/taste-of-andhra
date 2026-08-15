import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { DeliveryQuote } from '@/types/DeliveryQuote'
import type {
  DeliveryProvider,
  DeliverySettings,
  ServiceAreaCheck,
} from '@/types/DeliverySettings'
import * as deliverySettingsService from '@/services/deliverySettingsService'
import { calculateRateCardAmount } from '@/utils/deliveryRateCard'
import { haversineKm } from '@/utils/geo'
import { supabase } from '@/services/supabaseClient'
import type { Address } from '@/types/Address'

export interface QuoteRequestInput {
  address: Address
  branchId?: string | null
  subtotal: number
  itemCount: number
}

export interface GuestDeliveryAddressInput {
  line1: string
  line2?: string
  landmark?: string
  city: string
  state: string
  pincode: string
  latitude?: number | null
  longitude?: number | null
}

export interface PhoneOrderQuoteInput {
  savedAddress?: Address | null
  guestAddress?: GuestDeliveryAddressInput | null
  branchId?: string | null
  branchLatitude?: number | null
  branchLongitude?: number | null
  subtotal: number
  itemCount: number
}

interface QuoteFunctionResponse {
  quoteId: string | null
  provider: string
  is_serviceable: boolean
  amount: number
  eta_minutes: number | null
  distance_km: number | null
  unserviceable_reason: string | null
  expiresAt: string | null
  provider_amount: number | null
}

/**
 * Prices an order from the rate card when the quote function is unreachable.
 * Serviceability still comes from the database check, so an outage relaxes the
 * price but never the delivery area. Where even that check is unavailable, the
 * pincode allowlist is applied here so coverage is never silently dropped.
 */
export function buildRateCardQuote(
  address: Address,
  subtotal: number,
  settings: DeliverySettings,
  area: ServiceAreaCheck | null,
): DeliveryQuote {
  const isOutsideArea = area
    ? !area.isServiceable
    : !deliverySettingsService.isPincodeServiceable(address.pincode, settings)

  if (isOutsideArea) {
    return {
      quoteId: null,
      provider: 'own',
      isServiceable: false,
      amount: 0,
      etaMinutes: null,
      distanceKm: area?.distanceKm ?? null,
      unserviceableReason:
        area?.reason ?? `We do not deliver to pincode ${address.pincode} yet.`,
      expiresAt: null,
      isEstimate: true,
    }
  }

  return {
    quoteId: null,
    provider: 'own',
    isServiceable: true,
    amount: calculateRateCardAmount(
      settings,
      subtotal,
      area?.distanceKm ?? null,
    ),
    etaMinutes: null,
    distanceKm: area?.distanceKm ?? null,
    unserviceableReason: null,
    expiresAt: null,
    isEstimate: true,
  }
}

export async function getDeliveryQuote(
  input: QuoteRequestInput,
): Promise<ServiceResponse<DeliveryQuote>> {
  const { data, error } = await supabase.functions.invoke<QuoteFunctionResponse>(
    'delivery-quote',
    {
      body: {
        addressId: input.address.id,
        branchId: input.branchId ?? null,
        subtotal: input.subtotal,
        itemCount: input.itemCount,
      },
    },
  )

  if (error || !data) {
    console.warn('[deliveryQuote] falling back to rate card:', error?.message)

    const [settingsResult, area] = await Promise.all([
      deliverySettingsService.getDeliverySettings(input.branchId),
      deliverySettingsService.checkServiceArea(input.address.id, input.branchId),
    ])

    const settings = settingsResult.success
      ? settingsResult.data
      : deliverySettingsService.DEFAULT_DELIVERY_SETTINGS

    return createSuccessResponse(
      buildRateCardQuote(input.address, input.subtotal, settings, area),
    )
  }

  return createSuccessResponse({
    quoteId: data.quoteId,
    provider: (data.provider as DeliveryProvider) ?? 'own',
    isServiceable: data.is_serviceable,
    amount: Number(data.amount ?? 0),
    etaMinutes: data.eta_minutes,
    distanceKm: data.distance_km,
    unserviceableReason: data.unserviceable_reason,
    expiresAt: data.expiresAt,
    isEstimate: data.provider !== 'pidge',
  })
}

/**
 * Rate-card quote for phone/counter guest addresses (no saved address id).
 * Uses haversine distance when both branch and drop-off coordinates are known.
 */
export async function getGuestDeliveryQuote(input: {
  guestAddress: GuestDeliveryAddressInput
  branchId?: string | null
  branchLatitude?: number | null
  branchLongitude?: number | null
  subtotal: number
}): Promise<ServiceResponse<DeliveryQuote>> {
  const settingsResult = await deliverySettingsService.getDeliverySettings(
    input.branchId,
  )
  const settings = settingsResult.success
    ? settingsResult.data
    : deliverySettingsService.DEFAULT_DELIVERY_SETTINGS

  const pincode = input.guestAddress.pincode.trim()
  if (!deliverySettingsService.isPincodeServiceable(pincode, settings)) {
    return createSuccessResponse({
      quoteId: null,
      provider: 'own',
      isServiceable: false,
      amount: 0,
      etaMinutes: null,
      distanceKm: null,
      unserviceableReason: `We do not deliver to pincode ${pincode} yet.`,
      expiresAt: null,
      isEstimate: true,
    })
  }

  let distanceKm: number | null = null
  const dropLat = input.guestAddress.latitude
  const dropLng = input.guestAddress.longitude
  const branchLat = input.branchLatitude
  const branchLng = input.branchLongitude

  if (
    dropLat != null &&
    dropLng != null &&
    branchLat != null &&
    branchLng != null
  ) {
    distanceKm =
      Math.round(haversineKm(branchLat, branchLng, dropLat, dropLng) * 100) /
      100

    if (
      settings.max_distance_km !== null &&
      distanceKm > settings.max_distance_km
    ) {
      return createSuccessResponse({
        quoteId: null,
        provider: 'own',
        isServiceable: false,
        amount: 0,
        etaMinutes: null,
        distanceKm,
        unserviceableReason: `This address is about ${distanceKm.toFixed(1)} km away (max ${settings.max_distance_km} km).`,
        expiresAt: null,
        isEstimate: true,
      })
    }
  }

  return createSuccessResponse({
    quoteId: null,
    provider: 'own',
    isServiceable: true,
    amount: calculateRateCardAmount(settings, input.subtotal, distanceKm),
    etaMinutes: null,
    distanceKm,
    unserviceableReason: null,
    expiresAt: null,
    isEstimate: true,
  })
}

/** Saved-address quote when available; otherwise guest rate-card quote. */
export async function getPhoneOrderDeliveryQuote(
  input: PhoneOrderQuoteInput,
): Promise<ServiceResponse<DeliveryQuote>> {
  if (input.savedAddress) {
    return getDeliveryQuote({
      address: input.savedAddress,
      branchId: input.branchId,
      subtotal: input.subtotal,
      itemCount: input.itemCount,
    })
  }

  if (!input.guestAddress) {
    return createErrorResponse('Add a delivery address to calculate shipping.')
  }

  return getGuestDeliveryQuote({
    guestAddress: input.guestAddress,
    branchId: input.branchId,
    branchLatitude: input.branchLatitude,
    branchLongitude: input.branchLongitude,
    subtotal: input.subtotal,
  })
}

export async function dispatchToPidge(
  orderId: string,
): Promise<ServiceResponse<null>> {
  const { error } = await supabase.functions.invoke('pidge-dispatch', {
    body: { action: 'dispatch', orderId },
  })

  if (error) {
    return createErrorResponse(
      'Pidge could not accept this order. Assign one of your own partners instead.',
      error.message,
    )
  }

  return createSuccessResponse(null)
}

export interface PidgeConfigStatus {
  configured: boolean
  webhookConfigured: boolean
  channelName: string
  apiBase: string
  webhookUrl: string | null
  functionsReachable: boolean
}

export function pidgeWebhookUrl(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  if (!url || !url.startsWith('https://')) return null
  return `${url.replace(/\/$/, '')}/functions/v1/pidge-webhook`
}

/**
 * Asks the dispatch function whether Pidge secrets are set. Unreachable
 * functions are reported as not ready rather than as a hard error, so the
 * settings panel can tell the admin what is still missing.
 */
export async function getPidgeStatus(): Promise<
  ServiceResponse<PidgeConfigStatus>
> {
  const webhookUrl = pidgeWebhookUrl()
  const fallback: PidgeConfigStatus = {
    configured: false,
    webhookConfigured: false,
    channelName: 'taste-of-andhra',
    apiBase: 'https://api.pidge.in',
    webhookUrl,
    functionsReachable: false,
  }

  const { data, error } = await supabase.functions.invoke<{
    configured?: boolean
    webhookConfigured?: boolean
    channelName?: string
    apiBase?: string
    error?: string
  }>('pidge-dispatch', {
    body: { action: 'status' },
  })

  if (error || !data || data.error) {
    return createSuccessResponse(fallback)
  }

  return createSuccessResponse({
    configured: Boolean(data.configured),
    webhookConfigured: Boolean(data.webhookConfigured),
    channelName: data.channelName ?? 'taste-of-andhra',
    apiBase: data.apiBase ?? 'https://api.pidge.in',
    webhookUrl,
    functionsReachable: true,
  })
}

export async function cancelPidgeDispatch(
  orderId: string,
): Promise<ServiceResponse<null>> {
  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean
    cancelled?: boolean
    error?: string
  }>('pidge-dispatch', {
    body: { action: 'cancel', orderId },
  })

  if (error || data?.error) {
    return createErrorResponse(
      'Pidge could not cancel this rider. Cancel the job in the Pidge dashboard if it is still active.',
      error?.message ?? data?.error,
    )
  }

  return createSuccessResponse(null)
}

/** Best-effort cancel after a local order/delivery cancel. Never blocks kitchen. */
export function requestPidgeCancel(orderId: string): void {
  void cancelPidgeDispatch(orderId).then((result) => {
    if (!result.success) {
      console.warn('[pidge] cancel failed:', result.error ?? result.message)
    }
  })
}
