import { describe, expect, it } from 'vitest'
import {
  contrastTextOn,
  darkenHex,
  DEFAULT_STOREFRONT_THEME,
  mergeBrandingTheme,
  normalizeHexColor,
  parseStorefrontTheme,
  themeCssVariables,
  themeFromPreset,
} from './tenantTheme'

describe('normalizeHexColor', () => {
  it('accepts 6-digit hex and expands 3-digit', () => {
    expect(normalizeHexColor('#C62828')).toBe('#c62828')
    expect(normalizeHexColor('#9A3412')).toBe('#9a3412')
    expect(normalizeHexColor('#abc')).toBe('#aabbcc')
  })

  it('rejects invalid values', () => {
    expect(normalizeHexColor('red')).toBeNull()
    expect(normalizeHexColor('#gg0000')).toBeNull()
    expect(normalizeHexColor('url(javascript:alert(1))')).toBeNull()
  })
})

describe('darkenHex and contrastTextOn', () => {
  it('darkens a brand red for hover', () => {
    expect(darkenHex('#c62828')).toBe('#ae2323')
  })

  it('picks dark text on a light primary', () => {
    expect(contrastTextOn('#ffc107')).toBe('#212121')
    expect(contrastTextOn('#c62828')).toBe('#ffffff')
  })
})

describe('parseStorefrontTheme', () => {
  it('returns the default Andhra palette when branding is empty', () => {
    expect(parseStorefrontTheme({})).toEqual(DEFAULT_STOREFRONT_THEME)
    expect(parseStorefrontTheme(null)).toEqual(DEFAULT_STOREFRONT_THEME)
  })

  it('honours a legacy primary_color without a full theme object', () => {
    const theme = parseStorefrontTheme({ primary_color: '#9A3412' })
    expect(theme.primary).toBe('#9a3412')
    expect(theme.preset).toBe('custom')
    expect(theme.background).toBe(DEFAULT_STOREFRONT_THEME.background)
  })

  it('reads a saved theme and ignores unknown keys', () => {
    const theme = parseStorefrontTheme({
      logo_url: '/logo.png',
      theme: {
        preset: 'teal',
        primary: '#0f766e',
        secondary: '#b45309',
        accent: '#d4a574',
        background: '#f4f6f8',
        surface: '#ffffff',
        fontPair: 'modern',
        radius: 'round',
        extra: 'ignore-me',
      },
    })
    expect(theme.preset).toBe('teal')
    expect(theme.fontPair).toBe('modern')
    expect(theme.radius).toBe('round')
  })

  it('falls back invalid colors and enums to defaults', () => {
    const theme = parseStorefrontTheme({
      theme: {
        primary: 'not-a-color',
        fontPair: 'comic-sans',
        radius: 'squircle',
      },
    })
    expect(theme.primary).toBe(DEFAULT_STOREFRONT_THEME.primary)
    expect(theme.fontPair).toBe('classic')
    expect(theme.radius).toBe('soft')
  })
})

describe('themeFromPreset and mergeBrandingTheme', () => {
  it('builds a complete teal theme', () => {
    const theme = themeFromPreset('teal', { fontPair: 'system', radius: 'sharp' })
    expect(theme.preset).toBe('teal')
    expect(theme.primary).toBe('#0f766e')
    expect(theme.fontPair).toBe('system')
  })

  it('merges theme into existing branding without dropping logo or socials', () => {
    const next = mergeBrandingTheme(
      {
        logo_url: '/logo.png',
        instagram_url: 'https://instagram.com/kitchen',
      },
      themeFromPreset('forest'),
    )
    expect(next.logo_url).toBe('/logo.png')
    expect(next.instagram_url).toBe('https://instagram.com/kitchen')
    expect(next.primary_color).toBe('#1b5e20')
    expect(next.theme).toMatchObject({ preset: 'forest', primary: '#1b5e20' })
  })
})

describe('themeCssVariables', () => {
  it('maps tokens used by Tailwind utilities', () => {
    const vars = themeCssVariables(themeFromPreset('indigo'))
    expect(vars['--color-primary']).toBe('#3730a3')
    expect(vars['--color-on-primary']).toBe('#ffffff')
    expect(vars['--font-heading']).toContain('Playfair Display')
    expect(vars['--radius-card']).toBe('16px')
  })

  it('uses system font stacks for the fastest option', () => {
    const vars = themeCssVariables({
      ...DEFAULT_STOREFRONT_THEME,
      fontPair: 'system',
      radius: 'sharp',
    })
    expect(vars['--font-body']).toContain('system-ui')
    expect(vars['--radius-button']).toBe('6px')
  })
})
