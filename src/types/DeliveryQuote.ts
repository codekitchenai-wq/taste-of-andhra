import type { DeliveryProvider } from '@/types/DeliverySettings'

export interface DeliveryQuote {
  /** Null when the quote could not be persisted; the order then uses the rate card. */
  quoteId: string | null
  provider: DeliveryProvider
  isServiceable: boolean
  /** Customer-facing charge in rupees, markup already applied. */
  amount: number
  etaMinutes: number | null
  distanceKm: number | null
  unserviceableReason: string | null
  expiresAt: string | null
  /** True when the price came from the local rate card, not a live provider quote. */
  isEstimate: boolean
}
