/**
 * Pure helpers for WhatsApp conversation intents (tested in Vitest).
 * Edge runtime copies live in supabase/functions/_shared/whatsapp_conversation.ts.
 */

export const WHATSAPP_FLOW_ACTION = {
  VIEW_MENU: 'act:view_menu',
  MAIN_MENU: 'act:main_menu',
  HELP: 'act:help',
  ORDER_SOON: 'act:order_soon',
  BACK_CATEGORIES: 'act:back_categories',
} as const

export type WhatsAppFlowActionId =
  (typeof WHATSAPP_FLOW_ACTION)[keyof typeof WHATSAPP_FLOW_ACTION]

export function isWhatsAppOptOutText(text: string | null | undefined): boolean {
  if (!text) return false
  const normalized = text.trim().toUpperCase()
  return (
    normalized === 'STOP' ||
    normalized === 'UNSUBSCRIBE' ||
    normalized === 'CANCEL'
  )
}

export function resolveWhatsAppTextIntent(
  text: string | null | undefined,
): string | null {
  if (!text) return null
  const normalized = text.trim().toLowerCase()

  if (
    normalized === 'hi' ||
    normalized === 'hello' ||
    normalized === 'hey' ||
    normalized === 'start' ||
    normalized === 'menu' ||
    normalized === 'hi!' ||
    normalized === 'hola'
  ) {
    return WHATSAPP_FLOW_ACTION.MAIN_MENU
  }

  if (normalized === 'help' || normalized === 'support') {
    return WHATSAPP_FLOW_ACTION.HELP
  }

  if (
    normalized.includes('view menu') ||
    normalized === 'categories' ||
    normalized === 'browse'
  ) {
    return WHATSAPP_FLOW_ACTION.VIEW_MENU
  }

  return null
}

export function parseWhatsAppActionId(actionId: string): {
  kind:
    | 'action'
    | 'category'
    | 'category_page'
    | 'dish'
    | 'dish_page'
    | 'unknown'
  value?: string
  page?: number
  categoryId?: string
} {
  if (actionId.startsWith('act:')) {
    return { kind: 'action', value: actionId }
  }
  if (actionId.startsWith('catpage:')) {
    return {
      kind: 'category_page',
      page: Number(actionId.slice('catpage:'.length)) || 0,
    }
  }
  if (actionId.startsWith('cat:')) {
    return { kind: 'category', value: actionId.slice('cat:'.length) }
  }
  if (actionId.startsWith('dishpage:')) {
    const rest = actionId.slice('dishpage:'.length)
    const lastColon = rest.lastIndexOf(':')
    const categoryId = lastColon >= 0 ? rest.slice(0, lastColon) : rest
    const page = lastColon >= 0 ? Number(rest.slice(lastColon + 1)) || 0 : 0
    return { kind: 'dish_page', categoryId, page }
  }
  if (actionId.startsWith('dish:')) {
    return { kind: 'dish', value: actionId.slice('dish:'.length) }
  }
  return { kind: 'unknown' }
}

export function normalizeWhatsAppE164(from: string): string {
  const digits = from.replace(/\D/g, '')
  if (!digits) return from
  return `+${digits}`
}
