import {
  DEFAULT_ETA_MINUTES,
  FREE_DELIVERY_THRESHOLD,
  ORDER_DELIVERY_CHARGE,
} from '@/constants/ORDER'
import {
  createDefaultStoreHours,
  isValidTimeHHmm,
} from '@/utils/storeHours'
import type { DaySchedule, StoreOperatingHours } from '@/types/StoreHours'

function parsePincodeList(raw: string): { pincodes: string[]; invalid: string[] } {
  const tokens = raw
    .split(/[\s,;\n]+/)
    .map((token) => token.trim())
    .filter(Boolean)
  const pincodes = [...new Set(tokens.filter((token) => /^\d{6}$/.test(token)))].sort()
  return {
    pincodes,
    invalid: tokens.filter((token) => !/^\d{6}$/.test(token)),
  }
}

export interface RestaurantSetupValues {
  restaurantName?: string
  publicPhone?: string
  publicEmail?: string
  addressLine1?: string
  addressLine2?: string
  landmark?: string
  city?: string
  state?: string
  pincode?: string
  gstin?: string
  fssaiLicense?: string
  tagline?: string
  hoursWeekdays?: string
  hoursWeekends?: string
  delivers?: boolean
  servicePincodes?: string[]
  deliveryRadiusKm?: number | null
  deliveryCharge?: number
  freeDeliveryAbove?: number | null
  etaMinutes?: number
  upiId?: string
  upiPayeeName?: string
}

export interface RestaurantSetupFieldDef {
  key: keyof RestaurantSetupValues
  csvKey: string
  labels: string[]
  example: string
  notes: string
  defaultValue: string
}

export interface ParseRestaurantSetupResult {
  values: RestaurantSetupValues
  errors: string[]
  warnings: string[]
}

export const DEFAULT_SETUP_HOURS_WEEKDAYS = '11:00-23:00'
export const DEFAULT_SETUP_HOURS_WEEKENDS = '10:00-23:30'

export const RESTAURANT_SETUP_FIELDS: RestaurantSetupFieldDef[] = [
  {
    key: 'restaurantName',
    csvKey: 'restaurant_name',
    labels: ['restaurant name', 'restaurant display name', 'name'],
    example: 'Spice Garden',
    notes: 'Name shown to customers',
    defaultValue: '',
  },
  {
    key: 'publicPhone',
    csvKey: 'public_phone',
    labels: ['public phone', 'business phone', 'phone'],
    example: '9876543210',
    notes: 'Public / storefront phone',
    defaultValue: '',
  },
  {
    key: 'publicEmail',
    csvKey: 'public_email',
    labels: ['public email', 'business email', 'email'],
    example: 'hello@spicegarden.in',
    notes: 'Optional public email',
    defaultValue: '',
  },
  {
    key: 'addressLine1',
    csvKey: 'address_line_1',
    labels: ['address line 1', 'address'],
    example: '12 MG Road',
    notes: 'Street address',
    defaultValue: '',
  },
  {
    key: 'addressLine2',
    csvKey: 'address_line_2',
    labels: ['address line 2'],
    example: 'Near Metro',
    notes: 'Optional',
    defaultValue: '',
  },
  {
    key: 'landmark',
    csvKey: 'landmark',
    labels: ['landmark'],
    example: 'Opposite City Mall',
    notes: 'Optional',
    defaultValue: '',
  },
  {
    key: 'city',
    csvKey: 'city',
    labels: ['city'],
    example: 'Bangalore',
    notes: 'Required for go-live',
    defaultValue: '',
  },
  {
    key: 'state',
    csvKey: 'state',
    labels: ['state'],
    example: 'Karnataka',
    notes: 'Optional',
    defaultValue: '',
  },
  {
    key: 'pincode',
    csvKey: 'pincode',
    labels: ['pincode', 'pin code'],
    example: '560001',
    notes: '6-digit pincode',
    defaultValue: '',
  },
  {
    key: 'gstin',
    csvKey: 'gstin',
    labels: ['gstin', 'gst'],
    example: '29ABCDE1234F1Z5',
    notes: 'If registered',
    defaultValue: '',
  },
  {
    key: 'fssaiLicense',
    csvKey: 'fssai_license',
    labels: ['fssai license', 'fssai', 'fssai license number'],
    example: '11223344556677',
    notes: 'Food license number',
    defaultValue: '',
  },
  {
    key: 'tagline',
    csvKey: 'tagline',
    labels: ['tagline', 'cuisine'],
    example: 'Homestyle Andhra meals',
    notes: 'Short line on the homepage',
    defaultValue: '',
  },
  {
    key: 'hoursWeekdays',
    csvKey: 'hours_weekdays',
    labels: ['hours weekdays', 'weekday hours'],
    example: '11:00 AM – 11:00 PM',
    notes: 'Mon–Fri. Use 11:00-23:00 or 11:00 AM – 11:00 PM',
    defaultValue: DEFAULT_SETUP_HOURS_WEEKDAYS,
  },
  {
    key: 'hoursWeekends',
    csvKey: 'hours_weekends',
    labels: ['hours weekends', 'weekend hours'],
    example: '10:00 AM – 11:30 PM',
    notes: 'Sat–Sun',
    defaultValue: DEFAULT_SETUP_HOURS_WEEKENDS,
  },
  {
    key: 'delivers',
    csvKey: 'delivers',
    labels: ['delivers', 'delivery enabled'],
    example: 'yes',
    notes: 'yes or no',
    defaultValue: 'no',
  },
  {
    key: 'servicePincodes',
    csvKey: 'service_pincodes',
    labels: ['service pincodes', 'pincodes'],
    example: '560001,560002,560003',
    notes: 'Comma-separated. Empty = no pincode limit once delivery is on',
    defaultValue: '',
  },
  {
    key: 'deliveryRadiusKm',
    csvKey: 'delivery_radius_km',
    labels: ['delivery radius km', 'delivery radius', 'approx delivery radius'],
    example: '5',
    notes: 'Optional km limit from kitchen',
    defaultValue: '',
  },
  {
    key: 'deliveryCharge',
    csvKey: 'delivery_charge',
    labels: ['delivery charge'],
    example: String(ORDER_DELIVERY_CHARGE),
    notes: `Default ₹${ORDER_DELIVERY_CHARGE}`,
    defaultValue: String(ORDER_DELIVERY_CHARGE),
  },
  {
    key: 'freeDeliveryAbove',
    csvKey: 'free_delivery_above',
    labels: ['free delivery above', 'free delivery threshold'],
    example: String(FREE_DELIVERY_THRESHOLD),
    notes: `Default ₹${FREE_DELIVERY_THRESHOLD}. Blank = no free delivery`,
    defaultValue: String(FREE_DELIVERY_THRESHOLD),
  },
  {
    key: 'etaMinutes',
    csvKey: 'eta_minutes',
    labels: ['eta minutes', 'default eta', 'delivery time'],
    example: String(DEFAULT_ETA_MINUTES),
    notes: 'Default prep + delivery time (5–240)',
    defaultValue: String(DEFAULT_ETA_MINUTES),
  },
  {
    key: 'upiId',
    csvKey: 'upi_id',
    labels: ['upi id', 'upi vpa', 'upi'],
    example: 'spicegarden@okaxis',
    notes: 'Their UPI ID — do not use another restaurant’s',
    defaultValue: '',
  },
  {
    key: 'upiPayeeName',
    csvKey: 'upi_payee_name',
    labels: ['upi payee name', 'payee name'],
    example: 'Spice Garden',
    notes: 'Name shown on the UPI payment',
    defaultValue: '',
  },
]

export function defaultRestaurantSetupValues(): RestaurantSetupValues {
  return {
    hoursWeekdays: DEFAULT_SETUP_HOURS_WEEKDAYS,
    hoursWeekends: DEFAULT_SETUP_HOURS_WEEKENDS,
    delivers: false,
    servicePincodes: [],
    deliveryCharge: ORDER_DELIVERY_CHARGE,
    freeDeliveryAbove: FREE_DELIVERY_THRESHOLD,
    etaMinutes: DEFAULT_ETA_MINUTES,
  }
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

function normalizeFieldName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function findFieldDef(rawName: string): RestaurantSetupFieldDef | undefined {
  const normalized = normalizeFieldName(rawName)
  return RESTAURANT_SETUP_FIELDS.find((field) => {
    if (field.csvKey === normalized) return true
    return field.labels.some((label) => normalizeFieldName(label) === normalized)
  })
}

export function setupValueToCsvCell(
  key: keyof RestaurantSetupValues,
  values: RestaurantSetupValues,
): string {
  const value = values[key]
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (Array.isArray(value)) return value.join(',')
  return String(value)
}

export function buildRestaurantSetupCsv(
  values: RestaurantSetupValues = {},
): string {
  const header = ['field', 'value', 'example', 'notes'].join(',')
  const rows = RESTAURANT_SETUP_FIELDS.map((field) => {
    const filled = setupValueToCsvCell(field.key, values)
    const value = filled || field.defaultValue
    return [
      csvCell(field.csvKey),
      csvCell(value),
      csvCell(field.example),
      csvCell(field.notes),
    ].join(',')
  })
  return `${header}\n${rows.join('\n')}\n`
}

function parseBooleanCell(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return undefined
  if (['true', 'yes', '1', 'y'].includes(normalized)) return true
  if (['false', 'no', '0', 'n'].includes(normalized)) return false
  return undefined
}

function parseNumberCell(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const cleaned = trimmed.replace(/^(rs\.?|inr)/i, '').replace(/[₹,\s]/g, '')
  const amount = Number(cleaned)
  if (!Number.isFinite(amount)) return undefined
  return amount
}

/** Accepts 11:00, 11:00 AM, 11am, 23:00. */
export function parseSetupTime(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2] ?? '0')
  const meridiem = match[3]?.toLowerCase()
  if (minute > 59) return null
  if (meridiem) {
    if (hour < 1 || hour > 12) return null
    if (meridiem === 'am') {
      if (hour === 12) hour = 0
    } else if (hour !== 12) {
      hour += 12
    }
  } else if (hour > 23) {
    return null
  }
  const hhmm = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  return isValidTimeHHmm(hhmm) ? hhmm : null
}

export function parseHoursRange(raw: string): DaySchedule | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (['closed', 'off', 'no'].includes(trimmed.toLowerCase())) {
    return { isOpen: false, open: '00:00', close: '00:00' }
  }
  const parts = trimmed.split(/\s*(?:–|—|-|to)\s*/i).filter(Boolean)
  if (parts.length !== 2) return null
  const open = parseSetupTime(parts[0])
  const close = parseSetupTime(parts[1])
  if (!open || !close) return null
  return { isOpen: true, open, close }
}

export function storeHoursFromSetup(
  values: RestaurantSetupValues,
): StoreOperatingHours | null {
  const weekdays = values.hoursWeekdays
    ? parseHoursRange(values.hoursWeekdays)
    : null
  const weekends = values.hoursWeekends
    ? parseHoursRange(values.hoursWeekends)
    : null
  if (!weekdays && !weekends) return null

  const hours = createDefaultStoreHours()
  if (weekdays) {
    hours.schedule.monday = { ...weekdays }
    hours.schedule.tuesday = { ...weekdays }
    hours.schedule.wednesday = { ...weekdays }
    hours.schedule.thursday = { ...weekdays }
    hours.schedule.friday = { ...weekdays }
  }
  if (weekends) {
    hours.schedule.saturday = { ...weekends }
    hours.schedule.sunday = { ...weekends }
  }
  return hours
}

export function formatAddressFromSetup(values: RestaurantSetupValues): string {
  return [
    values.addressLine1,
    values.addressLine2,
    values.landmark,
    values.city,
    values.state,
    values.pincode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ')
}

export function parseRestaurantSetupCsv(text: string): ParseRestaurantSetupResult {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    return {
      values: {},
      errors: ['CSV needs a header row and at least one setting.'],
      warnings: [],
    }
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    normalizeFieldName(header),
  )
  const fieldIndex = headers.findIndex((header) =>
    ['field', 'setting', 'key', 'name'].includes(header),
  )
  const valueIndex = headers.findIndex((header) => header === 'value')

  if (fieldIndex < 0 || valueIndex < 0) {
    return {
      values: {},
      errors: ['CSV needs field and value columns.'],
      warnings: [],
    }
  }

  const values: RestaurantSetupValues = {}
  const errors: string[] = []
  const warnings: string[] = []
  let assigned = 0

  for (let i = 1; i < lines.length; i += 1) {
    const lineNumber = i + 1
    const cells = parseCsvLine(lines[i])
    const fieldName = (cells[fieldIndex] ?? '').trim()
    const rawValue = (cells[valueIndex] ?? '').trim()
    if (!fieldName) continue

    const def = findFieldDef(fieldName)
    if (!def) {
      warnings.push(`Line ${lineNumber}: unknown field "${fieldName}" skipped.`)
      continue
    }
    if (!rawValue) continue

    assigned += 1
    switch (def.key) {
      case 'delivers': {
        const parsed = parseBooleanCell(rawValue)
        if (parsed === undefined) {
          errors.push(`Line ${lineNumber}: delivers must be yes or no.`)
          break
        }
        values.delivers = parsed
        break
      }
      case 'servicePincodes': {
        const parsed = parsePincodeList(rawValue)
        if (parsed.invalid.length > 0) {
          errors.push(
            `Line ${lineNumber}: invalid pincode(s): ${parsed.invalid.join(', ')}`,
          )
        }
        values.servicePincodes = parsed.pincodes
        break
      }
      case 'deliveryRadiusKm':
      case 'deliveryCharge':
      case 'freeDeliveryAbove':
      case 'etaMinutes': {
        const amount = parseNumberCell(rawValue)
        if (amount === undefined) {
          errors.push(`Line ${lineNumber}: ${def.csvKey} must be a number.`)
          break
        }
        if (def.key === 'etaMinutes') {
          if (amount < 5 || amount > 240) {
            errors.push(`Line ${lineNumber}: eta_minutes must be between 5 and 240.`)
            break
          }
          values.etaMinutes = Math.round(amount)
          break
        }
        if (def.key === 'deliveryCharge') {
          if (amount < 0) {
            errors.push(`Line ${lineNumber}: delivery_charge cannot be negative.`)
            break
          }
          values.deliveryCharge = amount
          break
        }
        if (def.key === 'freeDeliveryAbove') {
          values.freeDeliveryAbove = amount <= 0 ? null : amount
          break
        }
        if (amount <= 0) {
          errors.push(`Line ${lineNumber}: delivery_radius_km must be greater than 0.`)
          break
        }
        values.deliveryRadiusKm = amount
        break
      }
      case 'hoursWeekdays':
      case 'hoursWeekends': {
        if (!parseHoursRange(rawValue)) {
          errors.push(
            `Line ${lineNumber}: ${def.csvKey} must look like 11:00-23:00 or 11:00 AM – 11:00 PM.`,
          )
          break
        }
        values[def.key] = rawValue
        break
      }
      case 'upiId': {
        if (rawValue && !rawValue.includes('@')) {
          errors.push(`Line ${lineNumber}: upi_id must look like name@bank.`)
          break
        }
        values.upiId = rawValue
        break
      }
      case 'pincode': {
        if (!/^\d{6}$/.test(rawValue)) {
          errors.push(`Line ${lineNumber}: pincode must be 6 digits.`)
          break
        }
        values.pincode = rawValue
        break
      }
      default: {
        ;(values[def.key] as string) = rawValue
      }
    }
  }

  if (assigned === 0 && errors.length === 0) {
    errors.push('No filled values found. Put data in the value column.')
  }

  return { values, errors, warnings }
}
