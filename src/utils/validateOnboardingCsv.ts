import { parseMenuCsv } from '@/utils/parseMenuCsv'
import { parseRestaurantSetupCsv } from '@/utils/parseRestaurantSetupCsv'

export type OnboardingSheetKind = 'setup' | 'menu'

export interface SheetValidation {
  ok: boolean
  summary: string
  errors: string[]
  warnings: string[]
}

export function isSpreadsheetNotCsv(fileName: string): boolean {
  return /\.(xlsx|xls|ods)$/i.test(fileName)
}

export function validateOnboardingCsv(
  kind: OnboardingSheetKind,
  text: string,
  fileName = '',
): SheetValidation {
  if (isSpreadsheetNotCsv(fileName)) {
    return {
      ok: false,
      summary: 'This is an Excel workbook, not CSV.',
      errors: [
        'In Excel use File → Save As → CSV (Comma delimited), then upload that file.',
      ],
      warnings: [],
    }
  }

  if (kind === 'setup') {
    const parsed = parseRestaurantSetupCsv(text)
    if (parsed.errors.length > 0) {
      return {
        ok: false,
        summary: 'Setup sheet has errors and cannot be loaded.',
        errors: parsed.errors,
        warnings: parsed.warnings,
      }
    }
    const filled = Object.values(parsed.values).filter((value) => {
      if (value == null) return false
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'string') return value.trim().length > 0
      return true
    }).length
    return {
      ok: true,
      summary: `Setup sheet is ready (${filled} field${filled === 1 ? '' : 's'} filled).`,
      errors: [],
      warnings: parsed.warnings,
    }
  }

  const parsed = parseMenuCsv(text)
  if (parsed.rows.length === 0 || parsed.errors.length > 0) {
    return {
      ok: false,
      summary:
        parsed.rows.length === 0
          ? 'Menu sheet has errors and cannot be loaded.'
          : `Menu sheet has ${parsed.errors.length} row error(s). Fix them before loading.`,
      errors:
        parsed.errors.length > 0
          ? parsed.errors
          : ['No valid menu rows found.'],
      warnings: [],
    }
  }

  const warnings: string[] = []
  if (looksLikeSampleMenu(parsed.rows.map((row) => row.name))) {
    warnings.push(
      'This still looks like the sample template (Paneer Tikka, Chicken 65, Dal Tadka…). Replace the rows with the restaurant’s real menu before go-live.',
    )
  }

  return {
    ok: true,
    summary: `Menu sheet is ready (${parsed.rows.length} dish${
      parsed.rows.length === 1 ? '' : 'es'
    }).`,
    errors: [],
    warnings,
  }
}

const SAMPLE_MENU_NAMES = [
  'paneer tikka',
  'chicken 65',
  'dal tadka',
  'butter chicken',
  'butter naan',
  'masala chaas',
]

function looksLikeSampleMenu(names: string[]): boolean {
  const normalized = new Set(names.map((name) => name.trim().toLowerCase()))
  const matched = SAMPLE_MENU_NAMES.filter((name) => normalized.has(name))
  return matched.length >= 4
}
