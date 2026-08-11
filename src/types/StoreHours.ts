export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface DaySchedule {
  /** When false, the store does not accept orders for this weekday. */
  isOpen: boolean
  /** Local open time as HH:mm (24h). */
  open: string
  /** Local close time as HH:mm (24h). May be earlier than open for overnight hours. */
  close: string
}

export interface DateOverride {
  /** Calendar date in the store timezone, YYYY-MM-DD. */
  date: string
  /** When false, closed all day (no orders). */
  isOpen: boolean
  open?: string
  close?: string
  note?: string
}

export interface StoreOperatingHours {
  timezone: string
  schedule: Record<Weekday, DaySchedule>
  overrides: DateOverride[]
}

export interface StoreOpenStatus {
  isOpen: boolean
  reason: string
  /** Today's effective window label, if any. */
  windowLabel: string | null
}
