import type {
  DateOverride,
  DaySchedule,
  StoreOpenStatus,
  StoreOperatingHours,
  Weekday,
} from '@/types/StoreHours'

export const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

export const DEFAULT_STORE_TIMEZONE = 'Asia/Kolkata'

export function createDefaultStoreHours(): StoreOperatingHours {
  const weekday: DaySchedule = { isOpen: true, open: '11:00', close: '23:00' }
  const weekend: DaySchedule = { isOpen: true, open: '10:00', close: '23:30' }

  return {
    timezone: DEFAULT_STORE_TIMEZONE,
    schedule: {
      monday: { ...weekday },
      tuesday: { ...weekday },
      wednesday: { ...weekday },
      thursday: { ...weekday },
      friday: { ...weekday },
      saturday: { ...weekend },
      sunday: { ...weekend },
    },
    overrides: [],
  }
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidTimeHHmm(value: string): boolean {
  return TIME_RE.test(value)
}

export function formatTimeLabel(hhmm: string): string {
  if (!isValidTimeHHmm(hhmm)) return hhmm
  const [hRaw, m] = hhmm.split(':')
  let h = Number(hRaw)
  const suffix = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${suffix}`
}

export function formatDayWindow(day: DaySchedule): string {
  if (!day.isOpen) return 'Closed'
  return `${formatTimeLabel(day.open)} – ${formatTimeLabel(day.close)}`
}

function weekdayFromParts(year: number, month: number, day: number): Weekday {
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const index = utc.getUTCDay()
  const map: Weekday[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  return map[index]
}

/** Local calendar parts for `date` in `timeZone`. */
export function getZonedParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = formatter.formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? NaN)

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  }
}

export function toDateKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function minutesOfDay(hour: number, minute: number): number {
  return hour * 60 + minute
}

function parseHHmmToMinutes(hhmm: string): number | null {
  if (!isValidTimeHHmm(hhmm)) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function isWithinWindow(
  nowMinutes: number,
  open: string,
  close: string,
): boolean {
  const openMin = parseHHmmToMinutes(open)
  const closeMin = parseHHmmToMinutes(close)
  if (openMin == null || closeMin == null) return false

  if (openMin === closeMin) {
    // Same open/close means 24 hours when the day is marked open.
    return true
  }

  if (closeMin > openMin) {
    return nowMinutes >= openMin && nowMinutes < closeMin
  }

  // Overnight window (e.g. 22:00 → 02:00).
  return nowMinutes >= openMin || nowMinutes < closeMin
}

function resolveEffectiveDay(
  hours: StoreOperatingHours,
  dateKey: string,
  weekday: Weekday,
): { day: DaySchedule; fromOverride: boolean; note?: string } {
  const override = hours.overrides.find((item) => item.date === dateKey)
  if (override) {
    if (!override.isOpen) {
      return {
        day: { isOpen: false, open: '00:00', close: '00:00' },
        fromOverride: true,
        note: override.note,
      }
    }
    return {
      day: {
        isOpen: true,
        open: override.open || hours.schedule[weekday].open,
        close: override.close || hours.schedule[weekday].close,
      },
      fromOverride: true,
      note: override.note,
    }
  }

  return { day: hours.schedule[weekday], fromOverride: false }
}

export function getStoreOpenStatus(
  hours: StoreOperatingHours,
  at: Date = new Date(),
): StoreOpenStatus {
  const timeZone = hours.timezone || DEFAULT_STORE_TIMEZONE
  const parts = getZonedParts(at, timeZone)
  const dateKey = toDateKey(parts.year, parts.month, parts.day)
  const weekday = weekdayFromParts(parts.year, parts.month, parts.day)
  const { day, fromOverride, note } = resolveEffectiveDay(
    hours,
    dateKey,
    weekday,
  )
  const windowLabel = day.isOpen ? formatDayWindow(day) : null
  const nowMinutes = minutesOfDay(parts.hour, parts.minute)

  if (!day.isOpen) {
    return {
      isOpen: false,
      reason: fromOverride
        ? note?.trim() ||
          `The store is closed today (${WEEKDAY_LABELS[weekday]}).`
        : `The store is closed on ${WEEKDAY_LABELS[weekday]}s.`,
      windowLabel: null,
    }
  }

  if (isWithinWindow(nowMinutes, day.open, day.close)) {
    return {
      isOpen: true,
      reason: fromOverride
        ? note?.trim() || `Open today until ${formatTimeLabel(day.close)}.`
        : `Open until ${formatTimeLabel(day.close)}.`,
      windowLabel,
    }
  }

  return {
    isOpen: false,
    reason: `Orders are accepted ${formatDayWindow(day)} today. The store is currently closed.`,
    windowLabel,
  }
}

export function parseStoreOperatingHours(
  raw: unknown,
): StoreOperatingHours | null {
  if (raw == null) return null

  let value: unknown = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    try {
      value = JSON.parse(trimmed) as unknown
    } catch {
      return null
    }
  }

  if (!value || typeof value !== 'object') return null
  const obj = value as Record<string, unknown>
  const scheduleRaw = obj.schedule
  if (!scheduleRaw || typeof scheduleRaw !== 'object') return null

  const defaults = createDefaultStoreHours()
  const schedule = { ...defaults.schedule }

  for (const day of WEEKDAYS) {
    const entry = (scheduleRaw as Record<string, unknown>)[day]
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const open = typeof row.open === 'string' ? row.open : schedule[day].open
    const close = typeof row.close === 'string' ? row.close : schedule[day].close
    schedule[day] = {
      isOpen: Boolean(row.isOpen ?? true),
      open: isValidTimeHHmm(open) ? open : schedule[day].open,
      close: isValidTimeHHmm(close) ? close : schedule[day].close,
    }
  }

  const overrides: DateOverride[] = []
  if (Array.isArray(obj.overrides)) {
    for (const item of obj.overrides) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const date = typeof row.date === 'string' ? row.date : ''
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
      const isOpen = Boolean(row.isOpen)
      const open =
        typeof row.open === 'string' && isValidTimeHHmm(row.open)
          ? row.open
          : undefined
      const close =
        typeof row.close === 'string' && isValidTimeHHmm(row.close)
          ? row.close
          : undefined
      overrides.push({
        date,
        isOpen,
        open,
        close,
        note: typeof row.note === 'string' ? row.note : undefined,
      })
    }
  }

  overrides.sort((a, b) => a.date.localeCompare(b.date))

  return {
    timezone:
      typeof obj.timezone === 'string' && obj.timezone.trim()
        ? obj.timezone.trim()
        : DEFAULT_STORE_TIMEZONE,
    schedule,
    overrides,
  }
}

export function validateStoreOperatingHours(
  hours: StoreOperatingHours,
): string | null {
  for (const day of WEEKDAYS) {
    const entry = hours.schedule[day]
    if (!entry.isOpen) continue
    if (!isValidTimeHHmm(entry.open) || !isValidTimeHHmm(entry.close)) {
      return `Set valid open and close times for ${WEEKDAY_LABELS[day]}.`
    }
  }

  const seen = new Set<string>()
  for (const override of hours.overrides) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(override.date)) {
      return 'Each special date must use YYYY-MM-DD format.'
    }
    if (seen.has(override.date)) {
      return `Duplicate special date: ${override.date}.`
    }
    seen.add(override.date)
    if (override.isOpen) {
      if (
        !override.open ||
        !override.close ||
        !isValidTimeHHmm(override.open) ||
        !isValidTimeHHmm(override.close)
      ) {
        return `Set open and close times for ${override.date}, or mark it closed.`
      }
    }
  }

  return null
}
