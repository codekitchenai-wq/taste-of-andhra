import { describe, expect, it } from 'vitest'
import {
  isWhatsAppOptOutText,
  normalizeWhatsAppE164,
  parseWhatsAppActionId,
  resolveWhatsAppTextIntent,
  WHATSAPP_FLOW_ACTION,
} from '@/utils/whatsappConversation'

describe('whatsappConversation', () => {
  it('detects opt-out phrases', () => {
    expect(isWhatsAppOptOutText('STOP')).toBe(true)
    expect(isWhatsAppOptOutText(' unsubscribe ')).toBe(true)
    expect(isWhatsAppOptOutText('CANCEL')).toBe(true)
    expect(isWhatsAppOptOutText('hi')).toBe(false)
  })

  it('maps greetings to main menu', () => {
    expect(resolveWhatsAppTextIntent('Hi')).toBe(WHATSAPP_FLOW_ACTION.MAIN_MENU)
    expect(resolveWhatsAppTextIntent('MENU')).toBe(
      WHATSAPP_FLOW_ACTION.MAIN_MENU,
    )
    expect(resolveWhatsAppTextIntent('help')).toBe(WHATSAPP_FLOW_ACTION.HELP)
    expect(resolveWhatsAppTextIntent('view menu please')).toBe(
      WHATSAPP_FLOW_ACTION.VIEW_MENU,
    )
    expect(resolveWhatsAppTextIntent('biryani')).toBeNull()
  })

  it('parses interactive action ids for the browse flow', () => {
    expect(parseWhatsAppActionId('cat:abc')).toEqual({
      kind: 'category',
      value: 'abc',
    })
    expect(parseWhatsAppActionId('dish:xyz')).toEqual({
      kind: 'dish',
      value: 'xyz',
    })
    expect(parseWhatsAppActionId('catpage:2')).toEqual({
      kind: 'category_page',
      page: 2,
    })
    expect(parseWhatsAppActionId('dishpage:cat-1:1')).toEqual({
      kind: 'dish_page',
      categoryId: 'cat-1',
      page: 1,
    })
    expect(parseWhatsAppActionId(WHATSAPP_FLOW_ACTION.VIEW_MENU).kind).toBe(
      'action',
    )
    expect(parseWhatsAppActionId(WHATSAPP_FLOW_ACTION.ORDER_SOON).kind).toBe(
      'action',
    )
    expect(parseWhatsAppActionId('nope').kind).toBe('unknown')
  })

  it('normalizes phone numbers', () => {
    expect(normalizeWhatsAppE164('919876543210')).toBe('+919876543210')
    expect(normalizeWhatsAppE164('+91 98765 43210')).toBe('+919876543210')
  })
})
