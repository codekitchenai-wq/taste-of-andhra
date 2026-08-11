export type DashboardRangePreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'custom'

export interface DashboardDateRange {
  preset: DashboardRangePreset
  /** Inclusive local calendar start YYYY-MM-DD */
  fromDate: string
  /** Inclusive local calendar end YYYY-MM-DD */
  toDate: string
  label: string
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseLocalDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

export function startOfLocalDayIso(dateKey: string): string {
  return parseLocalDateKey(dateKey).toISOString()
}

export function endOfLocalDayIso(dateKey: string): string {
  const date = parseLocalDateKey(dateKey)
  date.setHours(23, 59, 59, 999)
  return date.toISOString()
}

function addDays(dateKey: string, days: number): string {
  const date = parseLocalDateKey(dateKey)
  date.setDate(date.getDate() + days)
  return toLocalDateKey(date)
}

function daysBetweenInclusive(fromDate: string, toDate: string): number {
  const from = parseLocalDateKey(fromDate).getTime()
  const to = parseLocalDateKey(toDate).getTime()
  return Math.max(1, Math.round((to - from) / 86_400_000) + 1)
}

export function formatRangeLabel(fromDate: string, toDate: string): string {
  const from = parseLocalDateKey(fromDate)
  const to = parseLocalDateKey(toDate)
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: from.getFullYear() === to.getFullYear() ? undefined : 'numeric',
  }
  if (fromDate === toDate) {
    return from.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
  return `${from.toLocaleDateString('en-IN', opts)} – ${to.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`
}

export function createDashboardRange(
  preset: DashboardRangePreset,
  customFrom?: string,
  customTo?: string,
): DashboardDateRange {
  const today = toLocalDateKey(new Date())

  switch (preset) {
    case 'today':
      return {
        preset,
        fromDate: today,
        toDate: today,
        label: 'Today',
      }
    case 'yesterday': {
      const yesterday = addDays(today, -1)
      return {
        preset,
        fromDate: yesterday,
        toDate: yesterday,
        label: 'Yesterday',
      }
    }
    case 'last7': {
      const fromDate = addDays(today, -6)
      return {
        preset,
        fromDate,
        toDate: today,
        label: 'Last 7 days',
      }
    }
    case 'last30': {
      const fromDate = addDays(today, -29)
      return {
        preset,
        fromDate,
        toDate: today,
        label: 'Last 30 days',
      }
    }
    case 'thisMonth': {
      const now = new Date()
      const fromDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
      return {
        preset,
        fromDate,
        toDate: today,
        label: 'This month',
      }
    }
    case 'custom': {
      const fromDate = customFrom && customTo
        ? customFrom <= customTo
          ? customFrom
          : customTo
        : today
      const toDate = customFrom && customTo
        ? customFrom <= customTo
          ? customTo
          : customFrom
        : today
      return {
        preset,
        fromDate,
        toDate,
        label: formatRangeLabel(fromDate, toDate),
      }
    }
  }
}

/** Previous period of the same length, ending the day before `fromDate`. */
export function getPreviousComparableRange(
  range: DashboardDateRange,
): { fromDate: string; toDate: string } {
  const length = daysBetweenInclusive(range.fromDate, range.toDate)
  const toDate = addDays(range.fromDate, -1)
  const fromDate = addDays(toDate, -(length - 1))
  return { fromDate, toDate }
}

export const DASHBOARD_RANGE_PRESETS: {
  id: Exclude<DashboardRangePreset, 'custom'>
  label: string
}[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: '7 days' },
  { id: 'last30', label: '30 days' },
  { id: 'thisMonth', label: 'This month' },
]
