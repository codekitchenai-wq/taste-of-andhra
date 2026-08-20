const ANALYTICS_KEY = 'starter_analytics'

export type StarterAnalyticsCounters = {
  visitors: number
  menuViews: number
  whatsappClicks: number
  callClicks: number
  directionsClicks: number
}

function empty(): StarterAnalyticsCounters {
  return {
    visitors: 0,
    menuViews: 0,
    whatsappClicks: 0,
    callClicks: 0,
    directionsClicks: 0,
  }
}

export function readStarterAnalytics(orgId: string): StarterAnalyticsCounters {
  try {
    const raw = localStorage.getItem(`${ANALYTICS_KEY}:${orgId}`)
    if (!raw) return empty()
    return { ...empty(), ...JSON.parse(raw) }
  } catch {
    return empty()
  }
}

export function bumpStarterAnalytics(
  orgId: string,
  key: keyof StarterAnalyticsCounters,
  by = 1,
): void {
  try {
    const current = readStarterAnalytics(orgId)
    current[key] = (current[key] || 0) + by
    localStorage.setItem(`${ANALYTICS_KEY}:${orgId}`, JSON.stringify(current))
  } catch {
    // ignore quota / private mode
  }
}
