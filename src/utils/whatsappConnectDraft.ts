import {
  DEFAULT_WHATSAPP_ENABLED_STATUSES,
  WHATSAPP_CONNECT_DRAFT_STORAGE_KEY,
} from '@/constants/WHATSAPP'
import type { WhatsAppEnabledStatuses, WhatsAppProvider } from '@/types/WhatsApp'

export interface WhatsAppConnectDraft {
  provider: WhatsAppProvider
  displayPhone: string
  wabaId: string
  phoneNumberId: string
  accessToken: string
  verifyToken: string
  testPhone: string
  enabledStatuses: WhatsAppEnabledStatuses
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

export function readWhatsAppConnectDraft(): Partial<WhatsAppConnectDraft> | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(WHATSAPP_CONNECT_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    return parsed as Partial<WhatsAppConnectDraft>
  } catch {
    return null
  }
}

export function writeWhatsAppConnectDraft(draft: WhatsAppConnectDraft): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      WHATSAPP_CONNECT_DRAFT_STORAGE_KEY,
      JSON.stringify(draft),
    )
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearWhatsAppConnectDraft(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(WHATSAPP_CONNECT_DRAFT_STORAGE_KEY)
}

export function mergeWhatsAppConnectDraft(
  base: WhatsAppConnectDraft,
  patch: Partial<WhatsAppConnectDraft> | null | undefined,
): WhatsAppConnectDraft {
  if (!patch) return base

  return {
    provider: patch.provider ?? base.provider,
    displayPhone: patch.displayPhone ?? base.displayPhone,
    wabaId: patch.wabaId ?? base.wabaId,
    phoneNumberId: patch.phoneNumberId ?? base.phoneNumberId,
    accessToken: patch.accessToken ?? base.accessToken,
    verifyToken: patch.verifyToken ?? base.verifyToken,
    testPhone: patch.testPhone ?? base.testPhone,
    enabledStatuses: {
      ...DEFAULT_WHATSAPP_ENABLED_STATUSES,
      ...base.enabledStatuses,
      ...patch.enabledStatuses,
    },
  }
}
