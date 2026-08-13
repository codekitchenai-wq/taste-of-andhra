import type { OrderStatus } from '@/types/enums'
import { distanceInMeters, haversineKm } from '@/utils/geo'

/** Typical urban speed for a scooter / bike in traffic. */
export const CITY_SPEED_KMH = 20

/** Roads are longer than a straight line. */
export const ROAD_FACTOR = 1.3

/** Treat GPS as stale if the partner has not moved/updated recently. */
export const STALE_LOCATION_MS = 2 * 60_000

/** Close enough to show "arriving now" instead of 1 minute. */
export const ARRIVED_THRESHOLD_M = 80

export interface PartnerEtaInput {
  partnerLat: number | null | undefined
  partnerLng: number | null | undefined
  dropoffLat: number | null | undefined
  dropoffLng: number | null | undefined
  locationUpdatedAt?: string | null
  orderStatus?: OrderStatus | null
  nowMs?: number
}

export interface PartnerEtaDisplay {
  minutes: number | null
  distanceKm: number | null
  isStale: boolean
  isArriving: boolean
  hasFix: boolean
  /** Customer-facing sentence, or null when there is nothing useful to show. */
  customerLabel: string | null
  shortLabel: string | null
}

function hasCoordinate(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function estimateTravelMinutes(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0
  const hours = (distanceKm * ROAD_FACTOR) / CITY_SPEED_KMH
  return Math.max(1, Math.round(hours * 60))
}

export function isLocationStale(
  locationUpdatedAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!locationUpdatedAt) return false
  const updatedAt = new Date(locationUpdatedAt).getTime()
  if (Number.isNaN(updatedAt)) return false
  return nowMs - updatedAt > STALE_LOCATION_MS
}

export function getPartnerEtaDisplay(input: PartnerEtaInput): PartnerEtaDisplay {
  const nowMs = input.nowMs ?? Date.now()
  const empty: PartnerEtaDisplay = {
    minutes: null,
    distanceKm: null,
    isStale: false,
    isArriving: false,
    hasFix: false,
    customerLabel: null,
    shortLabel: null,
  }

  if (input.orderStatus === 'delivered') {
    return {
      ...empty,
      customerLabel: 'Your order has been delivered.',
      shortLabel: 'Delivered',
    }
  }

  if (input.orderStatus === 'cancelled') {
    return empty
  }

  if (
    !hasCoordinate(input.partnerLat) ||
    !hasCoordinate(input.partnerLng)
  ) {
    return empty
  }

  const hasDropoff =
    hasCoordinate(input.dropoffLat) && hasCoordinate(input.dropoffLng)

  if (!hasDropoff) {
    return {
      ...empty,
      hasFix: true,
      isStale: isLocationStale(input.locationUpdatedAt, nowMs),
      customerLabel: 'Partner location is live. Address pin is not available yet.',
      shortLabel: 'Live',
    }
  }

  const distanceKm = haversineKm(
    input.partnerLat,
    input.partnerLng,
    input.dropoffLat,
    input.dropoffLng,
  )
  const distanceM = distanceInMeters(
    input.partnerLat,
    input.partnerLng,
    input.dropoffLat,
    input.dropoffLng,
  )
  const isArriving = distanceM <= ARRIVED_THRESHOLD_M
  const minutes = isArriving ? 0 : estimateTravelMinutes(distanceKm)
  const isStale = isLocationStale(input.locationUpdatedAt, nowMs)

  if (isArriving) {
    return {
      minutes: 0,
      distanceKm,
      isStale,
      isArriving: true,
      hasFix: true,
      customerLabel: isStale
        ? 'Partner was nearby — location may be delayed.'
        : 'Partner is arriving now.',
      shortLabel: 'Arriving',
    }
  }

  return {
    minutes,
    distanceKm,
    isStale,
    isArriving: false,
    hasFix: true,
    customerLabel: isStale
      ? `About ${minutes} min away · location may be delayed`
      : `Partner is about ${minutes} min away`,
    shortLabel: `${minutes}m away`,
  }
}
