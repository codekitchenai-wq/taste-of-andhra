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
import { supabase } from '@/services/supabaseClient'
import type { Address } from '@/types/Address'

export interface QuoteRequestInput {
  address: Address
  branchId?: string | null
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

  const isFree =
    settings.free_delivery_threshold !== null &&
    subtotal >= settings.free_delivery_threshold

  return {
    quoteId: null,
    provider: 'own',
    isServiceable: true,
    amount: isFree ? 0 : settings.fallback_charge,
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

export async function dispatchToPidge(
  orderId: string,
): Promise<ServiceResponse<null>> {
  const { error } = await supabase.functions.invoke('pidge-dispatch', {
    body: { orderId },
  })

  if (error) {
    return createErrorResponse(
      'Pidge could not accept this order. Assign one of your own partners instead.',
      error.message,
    )
  }

  return createSuccessResponse(null)
}
