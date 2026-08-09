import { APP_NAME } from '@/constants/APP'
import {
  DEFAULT_PRINTER_SETTINGS,
  PRINTER_PRINTED_ORDERS_KEY,
  PRINTER_SETTINGS_KEY,
} from '@/constants/PRINTER'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type {
  PrintJobRequest,
  PrinterSettings,
  PrinterTicketType,
} from '@/types/Printer'
import type { AdminOrder } from '@/services/orderService'
import type { OrderFullDetails } from '@/types/Order'
import { supabase } from '@/services/supabaseClient'
import { isMissingColumnError } from '@/utils/supabaseSchema'
import { printHtmlInBrowser } from '@/utils/browserPrint'
import {
  buildPrintTicketPayload,
  buildTicketHtml,
  buildTicketText,
} from '@/utils/printTickets'

function parsePrinterSettings(raw: string | null): PrinterSettings {
  if (!raw) return { ...DEFAULT_PRINTER_SETTINGS }

  try {
    const parsed = JSON.parse(raw) as Partial<PrinterSettings>
    return {
      ...DEFAULT_PRINTER_SETTINGS,
      ...parsed,
      billing: {
        ...DEFAULT_PRINTER_SETTINGS.billing,
        ...(parsed.billing ?? {}),
      },
      kitchen: {
        ...DEFAULT_PRINTER_SETTINGS.kitchen,
        ...(parsed.kitchen ?? {}),
      },
    }
  } catch {
    return { ...DEFAULT_PRINTER_SETTINGS }
  }
}

async function getSettingValue(key: string): Promise<string | null> {
  const withOrg = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
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
      .eq('key', key)
      .maybeSingle()

    if (legacy.error) return null
    return (legacy.data?.value as string | undefined) ?? null
  }

  if (withOrg.error) return null
  return (withOrg.data?.value as string | undefined) ?? null
}

async function setSettingValue(
  key: string,
  value: string,
): Promise<ServiceResponse<string>> {
  let { error } = await supabase.from('app_settings').upsert(
    {
      organization_id: DEFAULT_ORGANIZATION_ID,
      key,
      value,
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
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )
    error = legacy.error
  }

  if (error) {
    return createErrorResponse('Unable to save printer settings.', error.message)
  }

  return createSuccessResponse(value)
}

export async function getPrinterSettings(): Promise<
  ServiceResponse<PrinterSettings>
> {
  const raw = await getSettingValue(PRINTER_SETTINGS_KEY)
  return createSuccessResponse(parsePrinterSettings(raw))
}

export async function setPrinterSettings(
  settings: PrinterSettings,
): Promise<ServiceResponse<PrinterSettings>> {
  const next: PrinterSettings = {
    ...DEFAULT_PRINTER_SETTINGS,
    ...settings,
    agentUrl: settings.agentUrl.trim() || DEFAULT_PRINTER_SETTINGS.agentUrl,
    billing: {
      ...DEFAULT_PRINTER_SETTINGS.billing,
      ...settings.billing,
      agentPrinterId:
        settings.billing.agentPrinterId.trim() ||
        DEFAULT_PRINTER_SETTINGS.billing.agentPrinterId,
    },
    kitchen: {
      ...DEFAULT_PRINTER_SETTINGS.kitchen,
      ...settings.kitchen,
      agentPrinterId:
        settings.kitchen.agentPrinterId.trim() ||
        DEFAULT_PRINTER_SETTINGS.kitchen.agentPrinterId,
    },
  }

  const result = await setSettingValue(
    PRINTER_SETTINGS_KEY,
    JSON.stringify(next),
  )
  if (!result.success) return result
  return createSuccessResponse(next)
}

export function readPrintedOrderIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(PRINTER_PRINTED_ORDERS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function markOrderPrinted(orderId: string): void {
  const ids = readPrintedOrderIds()
  ids.add(orderId)
  try {
    sessionStorage.setItem(
      PRINTER_PRINTED_ORDERS_KEY,
      JSON.stringify([...ids].slice(-200)),
    )
  } catch {
    // Ignore storage quota / private mode failures.
  }
}

async function sendToAgent(
  agentUrl: string,
  job: PrintJobRequest,
): Promise<void> {
  const base = agentUrl.replace(/\/$/, '')
  const response = await fetch(`${base}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Print agent returned ${response.status}`)
  }
}

export async function printTicket(
  order: AdminOrder | OrderFullDetails,
  ticketType: PrinterTicketType,
  settings?: PrinterSettings,
  options?: { forceBrowser?: boolean },
): Promise<ServiceResponse<{ ticketType: PrinterTicketType }>> {
  const settingsResult = settings
    ? createSuccessResponse(settings)
    : await getPrinterSettings()

  if (!settingsResult.success) return settingsResult

  const config = settingsResult.data
  const endpoint = ticketType === 'billing' ? config.billing : config.kitchen

  if (!endpoint.enabled && !options?.forceBrowser) {
    return createErrorResponse(
      `${endpoint.label} printing is disabled in settings.`,
    )
  }

  const payload = buildPrintTicketPayload(order, ticketType, APP_NAME)
  const html = buildTicketHtml(payload)
  const text = buildTicketText(payload)

  try {
    if (config.mode === 'browser' || options?.forceBrowser) {
      await printHtmlInBrowser(html)
    } else {
      await sendToAgent(config.agentUrl, {
        printerId: endpoint.agentPrinterId,
        ticketType,
        text,
        html,
        orderNumber: order.order_number,
        orderId: order.id,
      })
    }

    return createSuccessResponse({ ticketType })
  } catch (error) {
    return createErrorResponse(
      `Unable to print ${ticketType === 'kitchen' ? 'KOT' : 'bill'}.`,
      error instanceof Error ? error.message : String(error),
    )
  }
}

/**
 * Prints billing + kitchen tickets for a confirmed order (Swiggy/Zomato style).
 * Skips disabled endpoints. Safe to call for app + phone orders.
 */
export async function printOrderTickets(
  order: AdminOrder | OrderFullDetails,
  options?: {
    settings?: PrinterSettings
    /** When true, print even if master switch / auto-print is off (manual reprint). */
    manual?: boolean
  },
): Promise<
  ServiceResponse<{
    printed: PrinterTicketType[]
    skipped: PrinterTicketType[]
    errors: string[]
  }>
> {
  const settingsResult = options?.settings
    ? createSuccessResponse(options.settings)
    : await getPrinterSettings()

  if (!settingsResult.success) return settingsResult
  const settings = settingsResult.data

  if (!settings.enabled && !options?.manual) {
    return createSuccessResponse({
      printed: [],
      skipped: ['billing', 'kitchen'],
      errors: [],
    })
  }

  const printed: PrinterTicketType[] = []
  const skipped: PrinterTicketType[] = []
  const errors: string[] = []

  const targets: PrinterTicketType[] = ['billing', 'kitchen']
  for (const ticketType of targets) {
    const endpoint = ticketType === 'billing' ? settings.billing : settings.kitchen
    if (!endpoint.enabled) {
      skipped.push(ticketType)
      continue
    }

    const result = await printTicket(order, ticketType, settings, {
      forceBrowser: options?.manual && settings.mode === 'browser',
    })

    if (result.success) {
      printed.push(ticketType)
    } else {
      errors.push(result.message)
    }
  }

  if (printed.length) {
    markOrderPrinted(order.id)
  }

  if (!printed.length && errors.length) {
    return createErrorResponse(errors.join(' '), errors.join(' | '))
  }

  return createSuccessResponse({ printed, skipped, errors })
}

export async function checkPrintAgentHealth(
  agentUrl: string,
): Promise<ServiceResponse<{ ok: boolean; printers: string[] }>> {
  try {
    const base = agentUrl.replace(/\/$/, '')
    const response = await fetch(`${base}/health`, { method: 'GET' })
    if (!response.ok) {
      return createErrorResponse('Print agent is not healthy.')
    }
    const body = (await response.json()) as {
      ok?: boolean
      printers?: string[]
    }
    return createSuccessResponse({
      ok: Boolean(body.ok),
      printers: body.printers ?? [],
    })
  } catch (error) {
    return createErrorResponse(
      'Cannot reach print agent. Is it running on this PC?',
      error instanceof Error ? error.message : String(error),
    )
  }
}
