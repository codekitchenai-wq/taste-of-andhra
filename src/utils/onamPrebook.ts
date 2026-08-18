import { ONAM_SADHYA, type OnamServiceId } from '@/constants/ONAM_SADHYA'
import { normalizeIndianPhone } from '@/utils/phone'
import { storefrontWhatsAppUrl } from '@/utils/storefrontWhatsApp'

export const ONAM_PREBOOK_STORAGE_KEY = 'toa_onam_prebook'

export interface OnamPrebook {
  service: OnamServiceId
  date: string
  slot: string
  plates: number
  customerName: string
}

export interface OnamTimeSlot {
  value: string
  label: string
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return `${twelve}:00 ${suffix}`
}

export function onamTimeSlots(): OnamTimeSlot[] {
  const slots: OnamTimeSlot[] = []
  for (
    let hour = ONAM_SADHYA.slotStartHour;
    hour < ONAM_SADHYA.slotEndHour;
    hour += 1
  ) {
    slots.push({
      value: `${pad(hour)}:00`,
      label: `${formatHour(hour)} – ${formatHour(hour + 1)}`,
    })
  }
  return slots
}

export function onamDateLabel(date: string) {
  return ONAM_SADHYA.dates.find((row) => row.value === date)?.label ?? date
}

export function onamSlotLabel(slot: string) {
  return onamTimeSlots().find((row) => row.value === slot)?.label ?? slot
}

export function onamScheduledAt(date: string, slot: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(slot)) {
    return null
  }
  const iso = new Date(`${date}T${slot}:00+05:30`)
  if (Number.isNaN(iso.getTime())) return null
  return iso.toISOString()
}

export function isFutureOnamSchedule(
  iso: string | null | undefined,
): iso is string {
  if (!iso) return false
  const time = Date.parse(iso)
  return Number.isFinite(time) && time > Date.now()
}

export function defaultOnamPrebook(): OnamPrebook {
  return {
    service: 'parcel',
    date: ONAM_SADHYA.dates[0].value,
    slot: onamTimeSlots()[0]?.value ?? '11:00',
    plates: 2,
    customerName: '',
  }
}

export function clampOnamPlates(value: number) {
  if (!Number.isFinite(value)) return ONAM_SADHYA.minPlates
  return Math.min(
    ONAM_SADHYA.maxPlates,
    Math.max(ONAM_SADHYA.minPlates, Math.round(value)),
  )
}

export function parseOnamPrebook(raw: unknown): OnamPrebook | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const service =
    value.service === 'dine_in' || value.service === 'parcel'
      ? 'parcel'
      : null
  const date =
    typeof value.date === 'string' &&
    ONAM_SADHYA.dates.some((row) => row.value === value.date)
      ? value.date
      : null
  const slot =
    typeof value.slot === 'string' &&
    onamTimeSlots().some((row) => row.value === value.slot)
      ? value.slot
      : null
  const plates =
    typeof value.plates === 'number'
      ? clampOnamPlates(value.plates)
      : null
  if (!service || !date || !slot || !plates) return null

  return {
    service,
    date,
    slot,
    plates,
    customerName:
      typeof value.customerName === 'string' ? value.customerName.trim() : '',
  }
}

export function readOnamPrebook(): OnamPrebook | null {
  try {
    const raw = sessionStorage.getItem(ONAM_PREBOOK_STORAGE_KEY)
    if (!raw) return null
    return parseOnamPrebook(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeOnamPrebook(prebook: OnamPrebook) {
  sessionStorage.setItem(ONAM_PREBOOK_STORAGE_KEY, JSON.stringify(prebook))
}

export function clearOnamPrebook() {
  sessionStorage.removeItem(ONAM_PREBOOK_STORAGE_KEY)
}

export function onamOrderNote(prebook: OnamPrebook) {
  const service = ONAM_SADHYA.services[prebook.service]
  const lines = [
    'ONAM SADHYA PRE-BOOK',
    `Service: ${service.label}`,
    `Date: ${onamDateLabel(prebook.date)}`,
    `Slot: ${onamSlotLabel(prebook.slot)}`,
    `Plates: ${prebook.plates}`,
  ]
  if (prebook.customerName) {
    lines.push(`Name: ${prebook.customerName}`)
  }
  return lines.join('\n')
}

export function onamWhatsAppMessage(prebook: OnamPrebook) {
  const service = ONAM_SADHYA.services[prebook.service]
  const subtotal = service.price * prebook.plates
  const greeting = prebook.customerName
    ? `Hi, this is ${prebook.customerName}.`
    : 'Hi,'

  return [
    greeting,
    `I would like to pre-book Onam Sadhya at ${ONAM_SADHYA.restaurant}.`,
    '',
    `• ${service.label}`,
    `• ${prebook.plates} plate${prebook.plates === 1 ? '' : 's'}`,
    `• ${onamDateLabel(prebook.date)}`,
    `• ${onamSlotLabel(prebook.slot)}`,
    `• ₹${service.price} + tax per plate (about ₹${subtotal} + tax)`,
    '',
    'Please confirm the booking.',
  ].join('\n')
}

export function onamWhatsAppUrl(prebook: OnamPrebook) {
  const phone = normalizeIndianPhone(ONAM_SADHYA.bookingPhone) ?? '7841822215'
  return storefrontWhatsAppUrl(
    {
      name: ONAM_SADHYA.restaurant,
      tagline: '',
      description: '',
      phone: `+91 ${phone}`,
      alternatePhone: null,
      phones: [`+91 ${phone}`],
      email: null,
      address: '',
      mapsUrl: '',
      weekdayHours: '',
      weekendHours: '',
    },
    onamWhatsAppMessage(prebook),
  )
}
