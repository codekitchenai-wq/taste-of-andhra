import type { SpiceLevel } from '@/types/enums'

export interface MenuCsvRow {
  category: string
  name: string
  price: number
  isVeg: boolean
  spiceLevel: SpiceLevel | null
  description: string
  preparationTimeMinutes: number | null
  isAvailable: boolean
  isFeatured: boolean
  displayOrder: number
  lineNumber: number
}

export interface ParseMenuCsvResult {
  rows: MenuCsvRow[]
  errors: string[]
}

const SPICE_LEVELS: SpiceLevel[] = ['mild', 'medium', 'hot', 'extra_hot']

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

function parseBoolean(value: string, fallback: boolean): boolean {
  const parsed = parseVegFlag(value)
  if (parsed == null) return fallback
  return parsed
}

/** Veg/non-veg as kitchens write it. null = unrecognized (do not guess). */
export function parseVegFlag(value: string): boolean | null {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
  if (!normalized) return null
  if (
    ['true', 'yes', '1', 'y', 'veg', 'v', 'vegetarian'].includes(normalized)
  ) {
    return true
  }
  if (
    [
      'false',
      'no',
      '0',
      'n',
      'nv',
      'non veg',
      'nonveg',
      'non vegetarian',
      'nonvegetarian',
    ].includes(normalized)
  ) {
    return false
  }
  return null
}

function parsePrice(value: string): number | null {
  const cleaned = value
    .trim()
    .replace(/^(rs\.?|inr)/i, '')
    .replace(/[₹,\s]/g, '')
  const amount = Number(cleaned)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return amount
}

function parseSpice(value: string): SpiceLevel | null {
  const normalized = value.trim().toLowerCase().replace(' ', '_')
  if (!normalized) return null
  return SPICE_LEVELS.includes(normalized as SpiceLevel)
    ? (normalized as SpiceLevel)
    : null
}

export function parseMenuCsv(text: string): ParseMenuCsvResult {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    return { rows: [], errors: ['CSV needs a header row and at least one dish.'] }
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.trim().toLowerCase(),
  )
  const index = (name: string) => headers.indexOf(name)

  const required = ['category', 'name', 'price', 'is_veg'] as const
  const missing = required.filter((name) => index(name) < 0)
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [`Missing required columns: ${missing.join(', ')}`],
    }
  }

  const rows: MenuCsvRow[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const lineNumber = i + 1
    const cells = parseCsvLine(lines[i])
    const read = (name: string) => {
      const at = index(name)
      return at >= 0 ? (cells[at] ?? '').trim() : ''
    }

    const category = read('category')
    const name = read('name')
    const price = parsePrice(read('price'))
    const isVegRaw = read('is_veg')

    if (!category || !name) {
      errors.push(`Line ${lineNumber}: category and name are required.`)
      continue
    }
    if (price === null) {
      errors.push(`Line ${lineNumber}: price must be a number (e.g. 249).`)
      continue
    }
    const isVeg = parseVegFlag(isVegRaw)
    if (isVeg == null) {
      errors.push(
        `Line ${lineNumber}: is_veg must be Veg / Non-veg (or TRUE / FALSE).`,
      )
      continue
    }

    const displayOrderRaw = Number.parseInt(read('display_order'), 10)
    const prepRaw = Number.parseInt(read('preparation_time_minutes'), 10)

    rows.push({
      category,
      name,
      price,
      isVeg,
      spiceLevel: parseSpice(read('spice_level')),
      description: read('description'),
      preparationTimeMinutes: Number.isFinite(prepRaw) ? prepRaw : null,
      isAvailable: parseBoolean(read('is_available'), true),
      isFeatured: parseBoolean(read('is_featured'), false),
      displayOrder: Number.isFinite(displayOrderRaw) ? displayOrderRaw : i,
      lineNumber,
    })
  }

  return { rows, errors }
}
