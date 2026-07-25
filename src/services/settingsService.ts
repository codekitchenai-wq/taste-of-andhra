import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import { DEFAULT_ETA_MINUTES } from '@/constants/ORDER'
import { supabase } from '@/services/supabaseClient'

const DEFAULT_ETA_KEY = 'default_eta_minutes'

function parseEtaMinutes(raw: string | null | undefined): number {
  const value = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(value) || value < 5 || value > 240) {
    return DEFAULT_ETA_MINUTES
  }
  return value
}

export async function getDefaultEtaMinutes(): Promise<
  ServiceResponse<number>
> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', DEFAULT_ETA_KEY)
    .maybeSingle()

  if (error) {
    // Table may not exist yet before migration — fall back quietly.
    if (error.message.toLowerCase().includes('app_settings')) {
      return createSuccessResponse(DEFAULT_ETA_MINUTES)
    }
    return createErrorResponse(
      'Unable to load delivery time settings.',
      error.message,
    )
  }

  return createSuccessResponse(parseEtaMinutes(data?.value as string | undefined))
}

export async function setDefaultEtaMinutes(
  minutes: number,
): Promise<ServiceResponse<number>> {
  const next = Math.round(minutes)

  if (!Number.isFinite(next) || next < 5 || next > 240) {
    return createErrorResponse(
      'Default delivery time must be between 5 and 240 minutes.',
    )
  }

  const { error } = await supabase.from('app_settings').upsert(
    {
      key: DEFAULT_ETA_KEY,
      value: String(next),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  )

  if (error) {
    return createErrorResponse(
      'Unable to save delivery time settings.',
      error.message,
    )
  }

  return createSuccessResponse(next)
}
