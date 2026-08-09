import type { PrinterSettings } from '@/types/Printer'

export const PRINTER_SETTINGS_KEY = 'printer_settings'

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  enabled: false,
  mode: 'agent',
  agentUrl: 'http://127.0.0.1:9101',
  autoPrintOnConfirm: true,
  billing: {
    label: 'Billing Counter',
    enabled: true,
    agentPrinterId: 'billing',
  },
  kitchen: {
    label: 'Kitchen (KOT)',
    enabled: true,
    agentPrinterId: 'kitchen',
  },
}

/** Session key used to avoid reprinting the same confirmed order. */
export const PRINTER_PRINTED_ORDERS_KEY = 'toa-printed-confirmed-orders'
