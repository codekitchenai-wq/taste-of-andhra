/**
 * Deterministic WhatsApp conversation router (welcome + menu browse).
 * Cart / checkout remains Phase 3 — this module never creates orders.
 */

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  normalizeWhatsAppPhone,
  sendWhatsAppButtons,
  sendWhatsAppList,
  sendWhatsAppText,
  type SendTemplateResult,
} from './whatsapp.ts'

export type ConversationState =
  | 'WELCOME'
  | 'BROWSING_CATEGORIES'
  | 'VIEWING_CATEGORY'
  | 'VIEWING_ITEM'
  | 'SUPPORT'

export const ACTION = {
  VIEW_MENU: 'act:view_menu',
  MAIN_MENU: 'act:main_menu',
  HELP: 'act:help',
  ORDER_SOON: 'act:order_soon',
  BACK_CATEGORIES: 'act:back_categories',
} as const

const LIST_PAGE_SIZE = 9 // leave 1 row for "More" when needed

export interface ParsedInbound {
  messageId: string
  from: string
  type: string
  text: string | null
  interactiveId: string | null
}

export interface ConversationCredentials {
  organizationId: string
  phoneNumberId: string
  accessToken: string
  restaurantName: string
  /** Public web menu URL, e.g. https://example.com/menu */
  storefrontUrl?: string | null
}

function orderOnlineHint(creds: ConversationCredentials): string {
  if (creds.storefrontUrl) {
    return `Order online: ${creds.storefrontUrl}`
  }
  return 'Order on our website for now.'
}

type SessionRow = {
  id: string
  current_state: ConversationState
  context_json: Record<string, unknown>
}

function formatPrice(price: number): string {
  return `₹${Number(price).toFixed(Number.isInteger(Number(price)) ? 0 : 2)}`
}

export function parseInboundMessage(
  message: Record<string, unknown>,
): ParsedInbound | null {
  const messageId = typeof message.id === 'string' ? message.id : ''
  const from = typeof message.from === 'string' ? message.from : ''
  if (!messageId || !from) return null

  const type = typeof message.type === 'string' ? message.type : 'unknown'
  let text: string | null = null
  let interactiveId: string | null = null

  if (type === 'text') {
    const body = (message.text as { body?: string } | undefined)?.body
    text = typeof body === 'string' ? body.trim() : null
  }

  if (type === 'interactive') {
    const interactive = message.interactive as
      | {
          type?: string
          button_reply?: { id?: string; title?: string }
          list_reply?: { id?: string; title?: string }
        }
      | undefined

    if (interactive?.type === 'button_reply') {
      interactiveId = interactive.button_reply?.id ?? null
      text = interactive.button_reply?.title ?? null
    } else if (interactive?.type === 'list_reply') {
      interactiveId = interactive.list_reply?.id ?? null
      text = interactive.list_reply?.title ?? null
    }
  }

  return { messageId, from, type, text, interactiveId }
}

export function isOptOutText(text: string | null): boolean {
  if (!text) return false
  const normalized = text.trim().toUpperCase()
  return (
    normalized === 'STOP' ||
    normalized === 'UNSUBSCRIBE' ||
    normalized === 'CANCEL'
  )
}

/** Map free-text greetings / shortcuts to action ids. */
export function resolveTextIntent(text: string | null): string | null {
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
    return ACTION.MAIN_MENU
  }

  if (normalized === 'help' || normalized === 'support') {
    return ACTION.HELP
  }

  if (
    normalized.includes('view menu') ||
    normalized === 'categories' ||
    normalized === 'browse'
  ) {
    return ACTION.VIEW_MENU
  }

  return null
}

function expiresAtIso(hours = 24): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

async function getOrCreateSession(
  admin: SupabaseClient,
  organizationId: string,
  phoneE164: string,
): Promise<SessionRow> {
  const { data: existing } = await admin
    .from('conversation_sessions')
    .select('id, current_state, context_json, expires_at')
    .eq('organization_id', organizationId)
    .eq('phone_e164', phoneE164)
    .maybeSingle()

  const now = Date.now()
  const expired =
    existing?.expires_at &&
    new Date(existing.expires_at as string).getTime() < now

  if (existing && !expired) {
    return {
      id: existing.id as string,
      current_state: existing.current_state as ConversationState,
      context_json: (existing.context_json as Record<string, unknown>) ?? {},
    }
  }

  const payload = {
    organization_id: organizationId,
    phone_e164: phoneE164,
    current_state: 'WELCOME' as const,
    context_json: {},
    expires_at: expiresAtIso(),
    started_at: new Date().toISOString(),
  }

  const { data, error } = await admin
    .from('conversation_sessions')
    .upsert(payload, { onConflict: 'organization_id,phone_e164' })
    .select('id, current_state, context_json')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to create conversation session.')
  }

  return {
    id: data.id as string,
    current_state: data.current_state as ConversationState,
    context_json: (data.context_json as Record<string, unknown>) ?? {},
  }
}

async function updateSession(
  admin: SupabaseClient,
  sessionId: string,
  state: ConversationState,
  context: Record<string, unknown>,
): Promise<void> {
  await admin
    .from('conversation_sessions')
    .update({
      current_state: state,
      context_json: context,
      expires_at: expiresAtIso(),
    })
    .eq('id', sessionId)
}

async function sendWelcome(
  creds: ConversationCredentials,
  toE164: string,
): Promise<SendTemplateResult> {
  return sendWhatsAppButtons({
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
    toE164,
    headerText: creds.restaurantName,
    bodyText: [
      `Welcome to ${creds.restaurantName}!`,
      'Browse categories and dishes here on WhatsApp.',
      'Full checkout in chat is coming soon.',
      orderOnlineHint(creds),
    ].join('\n'),
    footerText: 'Reply MENU anytime',
    buttons: [
      { id: ACTION.VIEW_MENU, title: 'View Menu' },
      { id: ACTION.ORDER_SOON, title: 'Order Food' },
      { id: ACTION.HELP, title: 'Help' },
    ],
  })
}

async function sendCategories(
  admin: SupabaseClient,
  creds: ConversationCredentials,
  toE164: string,
  page = 0,
): Promise<{ result: SendTemplateResult; hasMore: boolean; count: number }> {
  const { data: categories } = await admin
    .from('categories')
    .select('id, name, description, display_order')
    .eq('organization_id', creds.organizationId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  const list = categories ?? []
  if (list.length === 0) {
    const result = await sendWhatsAppButtons({
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.accessToken,
      toE164,
      bodyText:
        'Our menu is being updated. Please check back soon or visit our website.',
      buttons: [{ id: ACTION.MAIN_MENU, title: 'Main Menu' }],
    })
    return { result, hasMore: false, count: 0 }
  }

  const start = page * LIST_PAGE_SIZE
  const slice = list.slice(start, start + LIST_PAGE_SIZE)
  const hasMore = start + LIST_PAGE_SIZE < list.length

  const rows = slice.map((cat) => ({
    id: `cat:${cat.id}`,
    title: String(cat.name),
    description: cat.description
      ? String(cat.description).slice(0, 72)
      : undefined,
  }))

  if (hasMore) {
    rows.push({
      id: `catpage:${page + 1}`,
      title: 'More categories',
      description: 'See the next page',
    })
  }

  const result = await sendWhatsAppList({
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
    toE164,
    headerText: 'Menu',
    bodyText: 'Pick a category to see dishes:',
    buttonText: 'Categories',
    footerText: creds.restaurantName,
    sections: [{ rows }],
  })

  return { result, hasMore, count: list.length }
}

async function sendDishesInCategory(
  admin: SupabaseClient,
  creds: ConversationCredentials,
  toE164: string,
  categoryId: string,
  page = 0,
): Promise<{
  result: SendTemplateResult
  categoryName: string
  count: number
}> {
  const { data: category } = await admin
    .from('categories')
    .select('id, name')
    .eq('id', categoryId)
    .eq('organization_id', creds.organizationId)
    .eq('is_active', true)
    .maybeSingle()

  if (!category) {
    const result = await sendWhatsAppButtons({
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.accessToken,
      toE164,
      bodyText: 'That category is no longer available.',
      buttons: [
        { id: ACTION.VIEW_MENU, title: 'View Menu' },
        { id: ACTION.MAIN_MENU, title: 'Main Menu' },
      ],
    })
    return { result, categoryName: 'Menu', count: 0 }
  }

  const { data: dishes } = await admin
    .from('dishes')
    .select('id, name, price, description, is_veg')
    .eq('organization_id', creds.organizationId)
    .eq('category_id', categoryId)
    .eq('is_available', true)
    .order('name', { ascending: true })

  const list = dishes ?? []
  const categoryName = String(category.name)

  if (list.length === 0) {
    const result = await sendWhatsAppButtons({
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.accessToken,
      toE164,
      bodyText: `${categoryName} has no available dishes right now.`,
      buttons: [
        { id: ACTION.VIEW_MENU, title: 'Categories' },
        { id: ACTION.MAIN_MENU, title: 'Main Menu' },
      ],
    })
    return { result, categoryName, count: 0 }
  }

  const start = page * LIST_PAGE_SIZE
  const slice = list.slice(start, start + LIST_PAGE_SIZE)
  const hasMore = start + LIST_PAGE_SIZE < list.length

  const rows = slice.map((dish) => ({
    id: `dish:${dish.id}`,
    title: String(dish.name),
    description: `${formatPrice(Number(dish.price))}${
      dish.is_veg ? ' · Veg' : ' · Non-veg'
    }`,
  }))

  if (hasMore) {
    rows.push({
      id: `dishpage:${categoryId}:${page + 1}`,
      title: 'More dishes',
      description: 'See the next page',
    })
  } else if (rows.length < 10) {
    rows.push({
      id: ACTION.BACK_CATEGORIES,
      title: 'All categories',
      description: 'Back to menu',
    })
  }

  const result = await sendWhatsAppList({
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
    toE164,
    headerText: categoryName,
    bodyText: `Dishes in ${categoryName}:`,
    buttonText: 'Dishes',
    footerText: creds.restaurantName,
    sections: [{ rows }],
  })

  return { result, categoryName, count: list.length }
}

async function sendDishDetails(
  admin: SupabaseClient,
  creds: ConversationCredentials,
  toE164: string,
  dishId: string,
): Promise<{ result: SendTemplateResult; categoryId: string | null }> {
  const { data: dish } = await admin
    .from('dishes')
    .select(
      'id, name, description, price, is_veg, spice_level, preparation_time, category_id, is_available',
    )
    .eq('id', dishId)
    .eq('organization_id', creds.organizationId)
    .maybeSingle()

  if (!dish || !dish.is_available) {
    const result = await sendWhatsAppButtons({
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.accessToken,
      toE164,
      bodyText: 'That dish is not available right now.',
      buttons: [
        { id: ACTION.VIEW_MENU, title: 'View Menu' },
        { id: ACTION.MAIN_MENU, title: 'Main Menu' },
      ],
    })
    return { result, categoryId: null }
  }

  const lines = [
    `*${dish.name}*`,
    formatPrice(Number(dish.price)),
    dish.is_veg ? 'Vegetarian' : 'Non-vegetarian',
  ]

  if (dish.spice_level) lines.push(`Spice: ${dish.spice_level}`)
  if (dish.preparation_time) {
    lines.push(`Prep: ~${dish.preparation_time} min`)
  }
  if (dish.description) lines.push('', String(dish.description))
  lines.push('', 'WhatsApp checkout coming soon.', orderOnlineHint(creds))

  const categoryId = (dish.category_id as string) ?? null
  const buttons = [
    ...(categoryId
      ? [{ id: `cat:${categoryId}`, title: 'More in category' }]
      : [{ id: ACTION.VIEW_MENU, title: 'View Menu' }]),
    { id: ACTION.MAIN_MENU, title: 'Main Menu' },
  ]

  const result = await sendWhatsAppButtons({
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
    toE164,
    bodyText: lines.join('\n'),
    buttons,
  })

  return { result, categoryId }
}

async function sendHelp(
  creds: ConversationCredentials,
  toE164: string,
): Promise<SendTemplateResult> {
  return sendWhatsAppButtons({
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
    toE164,
    bodyText: [
      `You're chatting with ${creds.restaurantName}.`,
      '',
      '• View Menu — browse categories and dishes',
      '• Order Food — full WhatsApp checkout coming soon',
      '• Reply MENU anytime to return here',
      '• Reply STOP to opt out of notifications',
      orderOnlineHint(creds),
    ].join('\n'),
    buttons: [
      { id: ACTION.VIEW_MENU, title: 'View Menu' },
      { id: ACTION.MAIN_MENU, title: 'Main Menu' },
    ],
  })
}

async function sendOrderSoon(
  creds: ConversationCredentials,
  toE164: string,
): Promise<SendTemplateResult> {
  return sendWhatsAppButtons({
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
    toE164,
    bodyText: [
      'WhatsApp ordering is almost ready.',
      'Browse the menu here, or place your order on the web:',
      orderOnlineHint(creds),
    ].join('\n'),
    buttons: [
      { id: ACTION.VIEW_MENU, title: 'View Menu' },
      { id: ACTION.MAIN_MENU, title: 'Main Menu' },
    ],
  })
}

/**
 * Handle one inbound customer message for an org with whatsapp_ordering enabled.
 */
export async function handleConversationMessage(
  admin: SupabaseClient,
  creds: ConversationCredentials,
  inbound: ParsedInbound,
): Promise<{ handled: boolean; send?: SendTemplateResult; error?: string }> {
  const phoneE164 = normalizeWhatsAppPhone(inbound.from)
  const session = await getOrCreateSession(
    admin,
    creds.organizationId,
    phoneE164,
  )

  const actionId =
    inbound.interactiveId ?? resolveTextIntent(inbound.text) ?? ACTION.MAIN_MENU

  try {
    if (actionId === ACTION.MAIN_MENU) {
      await updateSession(admin, session.id, 'WELCOME', {})
      const send = await sendWelcome(creds, phoneE164)
      return { handled: true, send }
    }

    if (actionId === ACTION.HELP) {
      await updateSession(admin, session.id, 'SUPPORT', session.context_json)
      const send = await sendHelp(creds, phoneE164)
      return { handled: true, send }
    }

    if (actionId === ACTION.ORDER_SOON) {
      const send = await sendOrderSoon(creds, phoneE164)
      return { handled: true, send }
    }

    if (actionId === ACTION.VIEW_MENU || actionId === ACTION.BACK_CATEGORIES) {
      const { result, count } = await sendCategories(
        admin,
        creds,
        phoneE164,
        0,
      )
      await updateSession(admin, session.id, 'BROWSING_CATEGORIES', {
        category_page: 0,
        category_count: count,
      })
      return { handled: true, send: result }
    }

    if (actionId.startsWith('catpage:')) {
      const page = Number(actionId.slice('catpage:'.length)) || 0
      const { result, count } = await sendCategories(
        admin,
        creds,
        phoneE164,
        page,
      )
      await updateSession(admin, session.id, 'BROWSING_CATEGORIES', {
        category_page: page,
        category_count: count,
      })
      return { handled: true, send: result }
    }

    if (actionId.startsWith('cat:')) {
      const categoryId = actionId.slice('cat:'.length)
      const { result, categoryName, count } = await sendDishesInCategory(
        admin,
        creds,
        phoneE164,
        categoryId,
        0,
      )
      await updateSession(admin, session.id, 'VIEWING_CATEGORY', {
        category_id: categoryId,
        category_name: categoryName,
        dish_page: 0,
        dish_count: count,
      })
      return { handled: true, send: result }
    }

    if (actionId.startsWith('dishpage:')) {
      const rest = actionId.slice('dishpage:'.length)
      const lastColon = rest.lastIndexOf(':')
      const categoryId = lastColon >= 0 ? rest.slice(0, lastColon) : rest
      const page =
        lastColon >= 0 ? Number(rest.slice(lastColon + 1)) || 0 : 0
      const { result, categoryName, count } = await sendDishesInCategory(
        admin,
        creds,
        phoneE164,
        categoryId,
        page,
      )
      await updateSession(admin, session.id, 'VIEWING_CATEGORY', {
        category_id: categoryId,
        category_name: categoryName,
        dish_page: page,
        dish_count: count,
      })
      return { handled: true, send: result }
    }

    if (actionId.startsWith('dish:')) {
      const dishId = actionId.slice('dish:'.length)
      const { result, categoryId } = await sendDishDetails(
        admin,
        creds,
        phoneE164,
        dishId,
      )
      await updateSession(admin, session.id, 'VIEWING_ITEM', {
        ...session.context_json,
        dish_id: dishId,
        category_id: categoryId,
      })
      return { handled: true, send: result }
    }

    // Fallback: unknown text while in a flow → welcome
    await updateSession(admin, session.id, 'WELCOME', {})
    const send = await sendWelcome(creds, phoneE164)
    return { handled: true, send }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Conversation handler failed.'
    await sendWhatsAppText({
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.accessToken,
      toE164: phoneE164,
      bodyText:
        'Sorry, something went wrong. Please try again or reply MENU.',
    })
    return { handled: true, error: message }
  }
}
