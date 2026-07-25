// Returns the shipping charge shown at checkout, before payment.
//
// The result is persisted with the service role and read back during order
// creation, so the browser never decides what the customer pays for delivery.
// Serviceability comes from check_delivery_service_area(), the same rule set the
// orders insert guard uses, so own-fleet and provider orders are gated alike.
//
// Deploy: supabase functions deploy delivery-quote

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { isPidgeConfigured, requestQuote } from '../_shared/pidge.ts'
import {
  applyMarkup,
  DEFAULT_SETTINGS,
  roundCurrency,
  type DeliverySettingsRow,
} from '../_shared/quote.ts'

interface QuoteRequest {
  addressId?: string
  branchId?: string | null
  subtotal?: number
  itemCount?: number
}

interface ServiceAreaCheck {
  is_serviceable: boolean
  reason: string | null
  distance_km: number | null
  max_distance_km: number | null
}

const GRAMS_PER_ITEM = 400
const MIN_PACKAGE_GRAMS = 500

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405)
  }

  const authHeader = request.headers.get('Authorization') ?? ''

  if (!authHeader) {
    return errorResponse('Missing authorization header.', 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Server is missing Supabase credentials.', 500)
  }

  // Caller-scoped client resolves the user; RLS still applies to their reads.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return errorResponse('Please sign in to get a delivery quote.', 401)
  }

  let body: QuoteRequest
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body.')
  }

  if (!body.addressId) {
    return errorResponse('addressId is required.')
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: address, error: addressError } = await admin
    .from('addresses')
    .select('*')
    .eq('id', body.addressId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (addressError) {
    return errorResponse('Unable to load the delivery address.', 500)
  }

  if (!address) {
    return errorResponse('Delivery address not found.', 404)
  }

  // Branch-specific settings win; the global row is the fallback.
  const { data: settingsRows } = await admin
    .from('delivery_settings')
    .select('*')
    .or(
      body.branchId
        ? `branch_id.eq.${body.branchId},branch_id.is.null`
        : 'branch_id.is.null',
    )

  const branchSettings = (settingsRows ?? []).find(
    (row) => row.branch_id === body.branchId,
  )
  const globalSettings = (settingsRows ?? []).find(
    (row) => row.branch_id === null,
  )

  const settings: DeliverySettingsRow = {
    ...DEFAULT_SETTINGS,
    ...(globalSettings ?? {}),
    ...(branchSettings ?? {}),
  }

  const subtotal = Number(body.subtotal ?? 0)
  const itemCount = Math.max(1, Number(body.itemCount ?? 1))

  const expiresAt = new Date(
    Date.now() + settings.quote_ttl_seconds * 1000,
  ).toISOString()

  const persist = async (quote: {
    provider: string
    is_serviceable: boolean
    amount: number
    provider_amount: number | null
    eta_minutes: number | null
    distance_km: number | null
    provider_quote_id: string | null
    unserviceable_reason: string | null
  }) => {
    const { data, error } = await admin
      .from('delivery_quotes')
      .insert({
        user_id: user.id,
        address_id: address.id,
        branch_id: body.branchId ?? null,
        expires_at: expiresAt,
        ...quote,
      })
      .select('id')
      .single()

    if (error) {
      return jsonResponse({ ...quote, quoteId: null, expiresAt }, 200)
    }

    return jsonResponse({ ...quote, quoteId: data.id, expiresAt }, 200)
  }

  // Free-delivery promise wins over any provider price; the restaurant absorbs
  // the real cost on those orders.
  const isFreeDelivery =
    settings.free_delivery_threshold !== null &&
    subtotal >= settings.free_delivery_threshold

  const ownFleetQuote = (distanceKm: number | null) => ({
    provider: 'own',
    is_serviceable: true,
    amount: isFreeDelivery ? 0 : roundCurrency(settings.fallback_charge),
    provider_amount: null,
    eta_minutes: null,
    distance_km: distanceKm,
    provider_quote_id: null,
    unserviceable_reason: null,
  })

  const { data: areaRows, error: areaError } = await admin.rpc(
    'check_delivery_service_area',
    { p_address_id: address.id, p_branch_id: body.branchId ?? null },
  )

  // A failed check must not silently widen the service area, but it also must
  // not block a sale, so the order is quoted and reviewed by staff instead.
  if (areaError) {
    console.warn('[delivery-quote] service area check failed:', areaError.message)
    return persist(ownFleetQuote(null))
  }

  const area = (areaRows as ServiceAreaCheck[] | null)?.[0] ?? {
    is_serviceable: true,
    reason: null,
    distance_km: null,
    max_distance_km: null,
  }

  const distanceKm = area.distance_km !== null ? Number(area.distance_km) : null

  if (!area.is_serviceable) {
    return persist({
      provider: settings.is_enabled ? settings.provider : 'own',
      is_serviceable: false,
      amount: 0,
      provider_amount: null,
      eta_minutes: null,
      distance_km: distanceKm,
      provider_quote_id: null,
      unserviceable_reason:
        area.reason ?? 'We do not deliver to this address yet.',
    })
  }

  // Provider off, or not yet credentialed: quote the restaurant's own rate card.
  if (!settings.is_enabled || settings.provider !== 'pidge' || !isPidgeConfigured) {
    return persist(ownFleetQuote(distanceKm))
  }

  const { data: branch } = body.branchId
    ? await admin
        .from('branches')
        .select('*')
        .eq('id', body.branchId)
        .maybeSingle()
    : await admin
        .from('branches')
        .select('*')
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle()

  const missingPickupCoords =
    !branch || branch.latitude === null || branch.longitude === null
  const missingDropCoords =
    address.latitude === null || address.longitude === null

  // Without both ends pinned we cannot price a per-km route, so fall back
  // rather than sending Pidge a request that would be priced wrongly.
  if (missingPickupCoords || missingDropCoords) {
    return persist(ownFleetQuote(distanceKm))
  }

  const weightGrams = Math.max(MIN_PACKAGE_GRAMS, itemCount * GRAMS_PER_ITEM)

  let quote
  try {
    quote = await requestQuote({
      orderValue: subtotal,
      weightGrams,
      pickup: {
        name: branch.name,
        phone: branch.phone ?? '',
        latitude: Number(branch.latitude),
        longitude: Number(branch.longitude),
        addressLine: branch.address_line1,
        city: branch.city,
        state: branch.state,
        pincode: branch.pincode,
      },
      drop: {
        name: address.full_name,
        phone: address.phone,
        latitude: Number(address.latitude),
        longitude: Number(address.longitude),
        addressLine: address.address_line1,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
      },
    })
  } catch (error) {
    quote = {
      amount: null,
      etaMinutes: null,
      distanceKm: null,
      quoteId: null,
      serviceable: false,
      reason: error instanceof Error ? error.message : 'Pidge request failed.',
    }
  }

  // Never block a sale on the provider: an unpriced route still gets the
  // restaurant's own charge and is dispatched manually if needed.
  if (quote.amount === null) {
    console.warn('[delivery-quote] falling back to rate card:', quote.reason)
    return persist(ownFleetQuote(distanceKm))
  }

  const customerAmount = isFreeDelivery
    ? 0
    : applyMarkup(quote.amount, settings)

  return persist({
    provider: 'pidge',
    is_serviceable: true,
    amount: customerAmount,
    provider_amount: roundCurrency(quote.amount),
    eta_minutes: quote.etaMinutes,
    distance_km: quote.distanceKm ?? distanceKm,
    provider_quote_id: quote.quoteId,
    unserviceable_reason: null,
  })
})
