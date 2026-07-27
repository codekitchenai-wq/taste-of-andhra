import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import { DEFAULT_ETA_MINUTES } from '@/constants/ORDER'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { supabase } from '@/services/supabaseClient'
import { isMissingColumnError } from '@/utils/supabaseSchema'

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
  const withOrg = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', DEFAULT_ETA_KEY)
    .eq('organization_id', DEFAULT_ORGANIZATION_ID)
    .maybeSingle()

  if (
    withOrg.error &&
    isMissingColumnError(withOrg.error.message) &&
    withOrg.error.message.toLowerCase().includes('organization_id')
  ) {
    const legacy = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', DEFAULT_ETA_KEY)
      .maybeSingle()

    if (legacy.error) {
      if (legacy.error.message.toLowerCase().includes('app_settings')) {
        return createSuccessResponse(DEFAULT_ETA_MINUTES)
      }
      return createErrorResponse(
        'Unable to load delivery time settings.',
        legacy.error.message,
      )
    }

    return createSuccessResponse(
      parseEtaMinutes(legacy.data?.value as string | undefined),
    )
  }

  if (withOrg.error) {
    if (withOrg.error.message.toLowerCase().includes('app_settings')) {
      return createSuccessResponse(DEFAULT_ETA_MINUTES)
    }
    return createErrorResponse(
      'Unable to load delivery time settings.',
      withOrg.error.message,
    )
  }

  return createSuccessResponse(
    parseEtaMinutes(withOrg.data?.value as string | undefined),
  )
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

  let { error } = await supabase.from('app_settings').upsert(
    {
      organization_id: DEFAULT_ORGANIZATION_ID,
      key: DEFAULT_ETA_KEY,
      value: String(next),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,key' },
  )

  if (
    error &&
    isMissingColumnError(error.message) &&
    error.message.toLowerCase().includes('organization_id')
  ) {
    const legacy = await supabase.from('app_settings').upsert(
      {
        key: DEFAULT_ETA_KEY,
        value: String(next),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )
    error = legacy.error
  }

  if (error) {
    return createErrorResponse(
      'Unable to save delivery time settings.',
      error.message,
    )
  }

  return createSuccessResponse(next)
}
