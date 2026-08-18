/**
 * Per-tenant storefront theme. Applied as CSS variables on <html> so Tailwind
 * tokens (bg-primary, font-heading, …) update with no extra CSS or font files.
 */

export type StorefrontThemePresetId =
  | 'andhra'
  | 'teal'
  | 'indigo'
  | 'forest'
  | 'charcoal'
  | 'custom'

export type StorefrontFontPair = 'classic' | 'modern' | 'system'

export type StorefrontRadius = 'soft' | 'sharp' | 'round'

export interface StorefrontTheme {
  preset: StorefrontThemePresetId
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  fontPair: StorefrontFontPair
  radius: StorefrontRadius
}

export interface ThemePreset extends Omit<StorefrontTheme, 'preset' | 'fontPair' | 'radius'> {
  id: Exclude<StorefrontThemePresetId, 'custom'>
  name: string
  description: string
}

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export const DEFAULT_STOREFRONT_THEME: StorefrontTheme = {
  preset: 'andhra',
  primary: '#c62828',
  secondary: '#ef6c00',
  accent: '#ffc107',
  background: '#fff8f0',
  surface: '#ffffff',
  fontPair: 'classic',
  radius: 'soft',
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'andhra',
    name: 'Andhra Red',
    description: 'Warm red and gold',
    primary: '#c62828',
    secondary: '#ef6c00',
    accent: '#ffc107',
    background: '#fff8f0',
    surface: '#ffffff',
  },
  {
    id: 'teal',
    name: 'Coastal Teal',
    description: 'Teal, bronze, and sand',
    primary: '#0f766e',
    secondary: '#b45309',
    accent: '#d4a574',
    background: '#f4f6f8',
    surface: '#ffffff',
  },
  {
    id: 'indigo',
    name: 'Royal Indigo',
    description: 'Deep indigo and gold',
    primary: '#3730a3',
    secondary: '#7c3aed',
    accent: '#fbbf24',
    background: '#f5f3ff',
    surface: '#ffffff',
  },
  {
    id: 'forest',
    name: 'Garden Green',
    description: 'Leaf green and lime',
    primary: '#1b5e20',
    secondary: '#558b2f',
    accent: '#c0ca33',
    background: '#f1f8e9',
    surface: '#ffffff',
  },
  {
    id: 'charcoal',
    name: 'Charcoal Gold',
    description: 'Dark ink and gold',
    primary: '#1f2937',
    secondary: '#b45309',
    accent: '#d4af37',
    background: '#faf7f2',
    surface: '#ffffff',
  },
]

export const FONT_PAIR_OPTIONS: {
  id: StorefrontFontPair
  name: string
  description: string
  heading: string
  body: string
}[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Playfair headings, Poppins body',
    heading: "'Playfair Display', Georgia, serif",
    body: "'Poppins', system-ui, sans-serif",
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Syne headings, Poppins body',
    heading: "'Syne', 'Poppins', system-ui, sans-serif",
    body: "'Poppins', system-ui, sans-serif",
  },
  {
    id: 'system',
    name: 'System',
    description: 'Device fonts — fastest load',
    heading: "Georgia, 'Times New Roman', serif",
    body: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
]

export const RADIUS_OPTIONS: {
  id: StorefrontRadius
  name: string
  description: string
  card: string
  button: string
  input: string
}[] = [
  {
    id: 'sharp',
    name: 'Sharp',
    description: 'Crisp, compact corners',
    card: '6px',
    button: '6px',
    input: '6px',
  },
  {
    id: 'soft',
    name: 'Soft',
    description: 'Current rounded look',
    card: '16px',
    button: '12px',
    input: '10px',
  },
  {
    id: 'round',
    name: 'Round',
    description: 'Friendlier, more curved',
    card: '20px',
    button: '16px',
    input: '14px',
  },
]

const THEME_CSS_KEYS = [
  '--color-primary',
  '--color-primary-dark',
  '--color-on-primary',
  '--color-secondary',
  '--color-accent',
  '--color-background',
  '--color-surface',
  '--font-heading',
  '--font-body',
  '--radius-card',
  '--radius-button',
  '--radius-input',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!HEX_COLOR.test(trimmed)) return null
  if (trimmed.length === 4) {
    const r = trimmed[1]
    const g = trimmed[2]
    const b = trimmed[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return trimmed.toLowerCase()
}

function parseRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return null
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  }
}

function toHex(channel: number): string {
  return Math.max(0, Math.min(255, Math.round(channel)))
    .toString(16)
    .padStart(2, '0')
}

export function darkenHex(hex: string, amount = 0.12): string {
  const rgb = parseRgb(hex)
  if (!rgb) return DEFAULT_STOREFRONT_THEME.primary
  const factor = 1 - Math.max(0, Math.min(0.8, amount))
  return `#${toHex(rgb.r * factor)}${toHex(rgb.g * factor)}${toHex(rgb.b * factor)}`
}

function channelToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function contrastTextOn(hex: string): string {
  const rgb = parseRgb(hex)
  if (!rgb) return '#ffffff'
  const luminance =
    0.2126 * channelToLinear(rgb.r) +
    0.7152 * channelToLinear(rgb.g) +
    0.0722 * channelToLinear(rgb.b)
  return luminance > 0.55 ? '#212121' : '#ffffff'
}

function isFontPair(value: unknown): value is StorefrontFontPair {
  return value === 'classic' || value === 'modern' || value === 'system'
}

function isRadius(value: unknown): value is StorefrontRadius {
  return value === 'soft' || value === 'sharp' || value === 'round'
}

export function themeFromPreset(
  id: Exclude<StorefrontThemePresetId, 'custom'>,
  extras?: Partial<Pick<StorefrontTheme, 'fontPair' | 'radius'>>,
): StorefrontTheme {
  const preset = THEME_PRESETS.find((item) => item.id === id) ?? THEME_PRESETS[0]
  return {
    preset: preset.id,
    primary: preset.primary,
    secondary: preset.secondary,
    accent: preset.accent,
    background: preset.background,
    surface: preset.surface,
    fontPair: extras?.fontPair ?? DEFAULT_STOREFRONT_THEME.fontPair,
    radius: extras?.radius ?? DEFAULT_STOREFRONT_THEME.radius,
  }
}

export function matchPresetId(theme: Pick<
  StorefrontTheme,
  'primary' | 'secondary' | 'accent' | 'background' | 'surface'
>): StorefrontThemePresetId {
  const match = THEME_PRESETS.find(
    (preset) =>
      preset.primary === theme.primary &&
      preset.secondary === theme.secondary &&
      preset.accent === theme.accent &&
      preset.background === theme.background &&
      preset.surface === theme.surface,
  )
  return match?.id ?? 'custom'
}

export function normalizeStorefrontTheme(
  input: Partial<StorefrontTheme> | null | undefined,
): StorefrontTheme {
  const primary =
    normalizeHexColor(input?.primary) ?? DEFAULT_STOREFRONT_THEME.primary
  const secondary =
    normalizeHexColor(input?.secondary) ?? DEFAULT_STOREFRONT_THEME.secondary
  const accent =
    normalizeHexColor(input?.accent) ?? DEFAULT_STOREFRONT_THEME.accent
  const background =
    normalizeHexColor(input?.background) ?? DEFAULT_STOREFRONT_THEME.background
  const surface =
    normalizeHexColor(input?.surface) ?? DEFAULT_STOREFRONT_THEME.surface
  const fontPair = isFontPair(input?.fontPair)
    ? input.fontPair
    : DEFAULT_STOREFRONT_THEME.fontPair
  const radius = isRadius(input?.radius)
    ? input.radius
    : DEFAULT_STOREFRONT_THEME.radius
  const colors = { primary, secondary, accent, background, surface }
  return {
    preset: matchPresetId(colors),
    ...colors,
    fontPair,
    radius,
  }
}

export function parseStorefrontTheme(
  branding: Record<string, unknown> | null | undefined,
): StorefrontTheme {
  if (!branding) return DEFAULT_STOREFRONT_THEME

  const nested = isRecord(branding.theme) ? branding.theme : null
  if (nested) {
    return normalizeStorefrontTheme({
      primary: typeof nested.primary === 'string' ? nested.primary : undefined,
      secondary:
        typeof nested.secondary === 'string' ? nested.secondary : undefined,
      accent: typeof nested.accent === 'string' ? nested.accent : undefined,
      background:
        typeof nested.background === 'string' ? nested.background : undefined,
      surface: typeof nested.surface === 'string' ? nested.surface : undefined,
      fontPair: isFontPair(nested.fontPair) ? nested.fontPair : undefined,
      radius: isRadius(nested.radius) ? nested.radius : undefined,
    })
  }

  const legacyPrimary = normalizeHexColor(branding.primary_color)
  if (legacyPrimary) {
    return normalizeStorefrontTheme({
      ...DEFAULT_STOREFRONT_THEME,
      preset: 'custom',
      primary: legacyPrimary,
    })
  }

  return DEFAULT_STOREFRONT_THEME
}

export function mergeBrandingTheme(
  branding: Record<string, unknown> | null | undefined,
  theme: StorefrontTheme,
): Record<string, unknown> {
  const current = isRecord(branding) ? branding : {}
  const normalized = normalizeStorefrontTheme(theme)
  return {
    ...current,
    primary_color: normalized.primary,
    theme: normalized,
  }
}

export function themeCssVariables(
  theme: StorefrontTheme,
): Record<(typeof THEME_CSS_KEYS)[number], string> {
  const normalized = normalizeStorefrontTheme(theme)
  const fonts =
    FONT_PAIR_OPTIONS.find((item) => item.id === normalized.fontPair) ??
    FONT_PAIR_OPTIONS[0]
  const radii =
    RADIUS_OPTIONS.find((item) => item.id === normalized.radius) ??
    RADIUS_OPTIONS[1]

  return {
    '--color-primary': normalized.primary,
    '--color-primary-dark': darkenHex(normalized.primary),
    '--color-on-primary': contrastTextOn(normalized.primary),
    '--color-secondary': normalized.secondary,
    '--color-accent': normalized.accent,
    '--color-background': normalized.background,
    '--color-surface': normalized.surface,
    '--font-heading': fonts.heading,
    '--font-body': fonts.body,
    '--radius-card': radii.card,
    '--radius-button': radii.button,
    '--radius-input': radii.input,
  }
}

export function applyTenantThemeCss(theme: StorefrontTheme): void {
  if (typeof document === 'undefined') return
  const vars = themeCssVariables(theme)
  const root = document.documentElement
  for (const key of THEME_CSS_KEYS) {
    root.style.setProperty(key, vars[key])
  }
}

export function clearTenantThemeCss(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const key of THEME_CSS_KEYS) {
    root.style.removeProperty(key)
  }
}
