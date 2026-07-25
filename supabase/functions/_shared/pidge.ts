// Thin Pidge REST wrapper.
//
// Pidge does not publish a stable public spec, and the endpoints enabled on an
// account vary by contract, so every path is overridable via env. Responses are
// read defensively: we probe a few likely field names rather than assuming one
// shape, and any unknown shape surfaces as "no quote" so checkout falls back to
// the configured rate card instead of failing the sale.

const API_BASE = Deno.env.get('PIDGE_API_BASE_URL') ?? 'https://api.pidge.in'
const API_TOKEN = Deno.env.get('PIDGE_API_TOKEN') ?? ''

const QUOTE_PATH = Deno.env.get('PIDGE_QUOTE_PATH') ?? '/v1.0/store/channel/vendor/quote'
const CREATE_PATH = Deno.env.get('PIDGE_CREATE_ORDER_PATH') ?? '/v1.0/store/channel/vendor/order'
const CANCEL_PATH = Deno.env.get('PIDGE_CANCEL_ORDER_PATH') ?? '/v1.0/store/channel/vendor/order/{id}/cancel'

export const isPidgeConfigured = API_TOKEN.length > 0

export interface PidgeLocation {
  name: string
  phone: string
  latitude: number
  longitude: number
  addressLine: string
  city: string
  state: string
  pincode: string
  landmark?: string | null
  instructions?: string | null
}

export interface PidgeQuoteResult {
  amount: number | null
  etaMinutes: number | null
  distanceKm: number | null
  quoteId: string | null
  serviceable: boolean
  reason: string | null
}

export interface PidgeJobResult {
  jobId: string | null
  trackingUrl: string | null
  amount: number | null
  status: string | null
}

async function pidgeFetch(
  path: string,
  body: unknown,
  method = 'POST',
): Promise<{ ok: boolean; status: number; payload: unknown; text: string }> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  })

  const text = await response.text()

  let payload: unknown = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }

  return { ok: response.ok, status: response.status, payload, text }
}

/** Reads the first present numeric field, tolerating string-encoded numbers. */
function pickNumber(source: unknown, keys: string[]): number | null {
  if (!source || typeof source !== 'object') return null
  const record = source as Record<string, unknown>

  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return null
}

function pickString(source: unknown, keys: string[]): string | null {
  if (!source || typeof source !== 'object') return null
  const record = source as Record<string, unknown>

  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim() !== '') return value
    if (typeof value === 'number') return String(value)
  }

  return null
}

/** Pidge wraps successful payloads in `data`; unwrap one level when present. */
function unwrap(payload: unknown): unknown {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    if (record.data && typeof record.data === 'object') return record.data
  }
  return payload
}

function buildLocation(location: PidgeLocation) {
  return {
    name: location.name,
    mobile: location.phone,
    address: {
      line_1: location.addressLine,
      line_2: location.landmark ?? '',
      landmark: location.landmark ?? '',
      city: location.city,
      state: location.state,
      pincode: location.pincode,
      country: 'India',
      latitude: location.latitude,
      longitude: location.longitude,
      instructions_to_reach: location.instructions ?? '',
    },
  }
}

export async function requestQuote(input: {
  pickup: PidgeLocation
  drop: PidgeLocation
  orderValue: number
  weightGrams: number
}): Promise<PidgeQuoteResult> {
  const empty: PidgeQuoteResult = {
    amount: null,
    etaMinutes: null,
    distanceKm: null,
    quoteId: null,
    serviceable: false,
    reason: null,
  }

  if (!isPidgeConfigured) {
    return { ...empty, reason: 'Pidge is not configured.' }
  }

  const { ok, payload, text, status } = await pidgeFetch(QUOTE_PATH, {
    pickup: buildLocation(input.pickup),
    drop: buildLocation(input.drop),
    package: {
      weight: input.weightGrams,
      volumetric_weight: input.weightGrams,
    },
    bill_amount: input.orderValue,
    cod_amount: 0,
    reference_id: crypto.randomUUID(),
  })

  if (!ok) {
    return {
      ...empty,
      reason: `Pidge quote failed (${status}): ${text.slice(0, 200)}`,
    }
  }

  const data = unwrap(payload)
  const amount = pickNumber(data, [
    'amount',
    'price',
    'total_price',
    'delivery_charge',
    'quote_amount',
    'estimated_price',
  ])

  if (amount === null) {
    return { ...empty, reason: 'Pidge returned no price for this route.' }
  }

  return {
    amount,
    etaMinutes: pickNumber(data, [
      'eta',
      'eta_minutes',
      'estimated_delivery_time',
      'delivery_eta',
    ]),
    distanceKm: pickNumber(data, ['distance', 'distance_km', 'total_distance']),
    quoteId: pickString(data, ['quote_id', 'id', 'reference_id']),
    serviceable: true,
    reason: null,
  }
}

export async function createJob(input: {
  referenceId: string
  pickup: PidgeLocation
  drop: PidgeLocation
  orderValue: number
  weightGrams: number
  codAmount: number
  items: { name: string; quantity: number; price: number }[]
}): Promise<{ ok: boolean; job: PidgeJobResult; error: string | null }> {
  const emptyJob: PidgeJobResult = {
    jobId: null,
    trackingUrl: null,
    amount: null,
    status: null,
  }

  if (!isPidgeConfigured) {
    return { ok: false, job: emptyJob, error: 'Pidge is not configured.' }
  }

  const { ok, payload, text, status } = await pidgeFetch(CREATE_PATH, {
    channel: Deno.env.get('PIDGE_CHANNEL_NAME') ?? 'taste-of-andhra',
    reference_id: input.referenceId,
    sender_detail: buildLocation(input.pickup),
    poc_detail: buildLocation(input.pickup),
    trips: [
      {
        receiver_detail: buildLocation(input.drop),
        reference_id: input.referenceId,
        cod_amount: input.codAmount,
        bill_amount: input.orderValue,
        weight: input.weightGrams,
        volumetric_weight: input.weightGrams,
        packages: input.items.map((item) => ({
          label: item.name,
          quantity: item.quantity,
          declared_price: item.price,
        })),
      },
    ],
  })

  if (!ok) {
    return {
      ok: false,
      job: emptyJob,
      error: `Pidge create order failed (${status}): ${text.slice(0, 300)}`,
    }
  }

  const data = unwrap(payload)

  return {
    ok: true,
    error: null,
    job: {
      jobId: pickString(data, ['id', 'order_id', 'pidge_id', 'reference_id']),
      trackingUrl: pickString(data, ['tracking_url', 'track_url', 'trackingUrl']),
      amount: pickNumber(data, ['amount', 'price', 'delivery_charge']),
      status: pickString(data, ['status', 'order_status']),
    },
  }
}

export async function cancelJob(
  jobId: string,
): Promise<{ ok: boolean; error: string | null }> {
  if (!isPidgeConfigured) {
    return { ok: false, error: 'Pidge is not configured.' }
  }

  const path = CANCEL_PATH.includes('{id}')
    ? CANCEL_PATH.replace('{id}', encodeURIComponent(jobId))
    : CANCEL_PATH

  const { ok, status, text } = await pidgeFetch(path, { id: jobId })

  return {
    ok,
    error: ok ? null : `Pidge cancel failed (${status}): ${text.slice(0, 200)}`,
  }
}
