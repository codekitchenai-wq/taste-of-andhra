import { MockSmsProvider } from './mockSms.ts'
import { MockWhatsAppProvider } from './mockWhatsApp.ts'
import { MetaWhatsAppProvider } from './metaWhatsApp.ts'
import type {
  CommunicationProviderId,
  SmsProvider,
  WhatsAppProvider,
} from './types.ts'

function resolveWhatsAppProviderId(
  explicit?: string | null,
): CommunicationProviderId {
  const fromEnv = (Deno.env.get('WHATSAPP_PROVIDER') ?? '').toLowerCase()
  const raw = (explicit ?? (fromEnv || 'meta_cloud')).toLowerCase()

  if (raw === 'mock') return 'mock'
  if (raw === 'gupshup' || raw === 'bsp_gupshup') return 'gupshup'
  if (raw === 'meta_cloud' || raw === 'meta') return 'meta_cloud'
  return 'meta_cloud'
}

function resolveSmsProviderId(
  explicit?: string | null,
): CommunicationProviderId {
  const fromEnv = (Deno.env.get('SMS_PROVIDER') ?? '').toLowerCase()
  const raw = (explicit ?? (fromEnv || 'mock')).toLowerCase()

  if (raw === 'mock') return 'mock'
  if (raw === 'gupshup') return 'gupshup'
  if (raw === 'msg91') return 'msg91'
  if (raw === 'twilio') return 'twilio'
  return 'mock'
}

/**
 * Central provider selection. Callers must not branch on provider names.
 */
export function getWhatsAppProvider(
  provider?: string | null,
): WhatsAppProvider {
  const id = resolveWhatsAppProviderId(provider)

  switch (id) {
    case 'mock':
      return new MockWhatsAppProvider()
    case 'meta_cloud':
      return new MetaWhatsAppProvider()
    case 'gupshup':
      // Phase D — until then, fail clearly rather than calling Meta by mistake.
      throw new Error(
        'Gupshup WhatsApp provider is not implemented yet. Set WHATSAPP_PROVIDER=mock|meta_cloud.',
      )
    default:
      return new MetaWhatsAppProvider()
  }
}

export function getSmsProvider(provider?: string | null): SmsProvider {
  const id = resolveSmsProviderId(provider)

  switch (id) {
    case 'mock':
      return new MockSmsProvider()
    case 'gupshup':
      throw new Error(
        'Gupshup SMS provider is not implemented yet. Set SMS_PROVIDER=mock.',
      )
    default:
      return new MockSmsProvider()
  }
}

export function getChannelProvider(
  channel: 'whatsapp' | 'sms',
  provider?: string | null,
): WhatsAppProvider | SmsProvider {
  return channel === 'sms'
    ? getSmsProvider(provider)
    : getWhatsAppProvider(provider)
}
