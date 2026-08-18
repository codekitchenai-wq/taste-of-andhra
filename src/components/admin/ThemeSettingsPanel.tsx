import { useEffect, useMemo, useRef, useState } from 'react'
import { Palette } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { useOrganization } from '@/contexts/OrganizationContext'
import * as settingsService from '@/services/settingsService'
import { cn } from '@/utils/cn'
import {
  applyTenantThemeCss,
  FONT_PAIR_OPTIONS,
  matchPresetId,
  normalizeHexColor,
  parseStorefrontTheme,
  RADIUS_OPTIONS,
  THEME_PRESETS,
  themeFromPreset,
  type StorefrontTheme,
  type StorefrontThemePresetId,
} from '@/utils/tenantTheme'

function ColorField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: string
  disabled?: boolean
  onChange: (hex: string) => void
}) {
  const pickerValue = normalizeHexColor(value) ?? '#c62828'

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={pickerValue}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 cursor-pointer rounded-[var(--radius-input)] border border-gray-300 bg-surface p-0.5 disabled:cursor-not-allowed"
        />
        <input
          type="text"
          spellCheck={false}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-[var(--radius-input)] border border-gray-300 bg-surface px-3 font-mono text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        />
      </div>
    </div>
  )
}

export function ThemeSettingsPanel() {
  const org = useOrganization()
  const savedTheme = useMemo(
    () => parseStorefrontTheme(org.branding),
    [org.branding],
  )
  const [draft, setDraft] = useState<StorefrontTheme>(savedTheme)
  const [isSaving, setIsSaving] = useState(false)
  const brandingRef = useRef(org.branding)
  brandingRef.current = org.branding
  const selectedPreset = matchPresetId(draft)

  useEffect(() => {
    setDraft(savedTheme)
  }, [savedTheme])

  useEffect(() => {
    if (org.isLoading) return
    const colors = [
      draft.primary,
      draft.secondary,
      draft.accent,
      draft.background,
      draft.surface,
    ]
    if (colors.some((value) => !normalizeHexColor(value))) return
    applyTenantThemeCss(draft)
  }, [draft, org.isLoading])

  useEffect(() => {
    return () => {
      applyTenantThemeCss(parseStorefrontTheme(brandingRef.current))
    }
  }, [])

  const handlePreset = (id: Exclude<StorefrontThemePresetId, 'custom'>) => {
    setDraft(themeFromPreset(id, { fontPair: draft.fontPair, radius: draft.radius }))
  }

  const handleColor = (key: keyof Pick<
    StorefrontTheme,
    'primary' | 'secondary' | 'accent' | 'background' | 'surface'
  >) =>
    (hex: string) => {
      setDraft((current) => ({ ...current, [key]: hex }))
    }

  const handleSave = async () => {
    const colorLabels = [
      ['primary', 'primary'],
      ['secondary', 'secondary'],
      ['accent', 'accent'],
      ['background', 'page background'],
      ['surface', 'card colour'],
    ] as const
    for (const [key, label] of colorLabels) {
      if (!normalizeHexColor(draft[key])) {
        toast.error(`Enter a valid hex colour for ${label} (e.g. #c62828).`)
        return
      }
    }

    setIsSaving(true)
    const result = await settingsService.setStorefrontTheme(draft)
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    org.setBranding(result.data)
    setDraft(parseStorefrontTheme(result.data))
    toast.success('Theme saved. Customers see it on your website immediately.')
  }

  const handleReset = () => {
    setDraft(savedTheme)
    applyTenantThemeCss(savedTheme)
  }

  const isDirty =
    draft.primary !== savedTheme.primary ||
    draft.secondary !== savedTheme.secondary ||
    draft.accent !== savedTheme.accent ||
    draft.background !== savedTheme.background ||
    draft.surface !== savedTheme.surface ||
    draft.fontPair !== savedTheme.fontPair ||
    draft.radius !== savedTheme.radius

  return (
    <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            <Palette className="h-5 w-5" />
            Theme & appearance
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Match this restaurant&apos;s website to your brand. Changes use CSS
            colour tokens already in the page — no extra fonts or stylesheets,
            so load speed stays the same.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-text-primary">Palettes</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Start from a preset, then tweak any colour.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {THEME_PRESETS.map((preset) => {
                const selected = selectedPreset === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={isSaving}
                    onClick={() => handlePreset(preset.id)}
                    className={cn(
                      'rounded-[var(--radius-button)] border p-2.5 text-left transition-colors',
                      selected
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-black/10 hover:border-primary/40',
                    )}
                  >
                    <span className="flex h-8 overflow-hidden rounded-md">
                      <span
                        className="w-1/2"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="w-1/4"
                        style={{ backgroundColor: preset.secondary }}
                      />
                      <span
                        className="w-1/4"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </span>
                    <span className="mt-2 block text-xs font-semibold text-text-primary">
                      {preset.name}
                    </span>
                    <span className="block text-[11px] text-text-secondary">
                      {preset.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ColorField
              label="Primary"
              value={draft.primary}
              disabled={isSaving}
              onChange={handleColor('primary')}
            />
            <ColorField
              label="Secondary"
              value={draft.secondary}
              disabled={isSaving}
              onChange={handleColor('secondary')}
            />
            <ColorField
              label="Accent"
              value={draft.accent}
              disabled={isSaving}
              onChange={handleColor('accent')}
            />
            <ColorField
              label="Page background"
              value={draft.background}
              disabled={isSaving}
              onChange={handleColor('background')}
            />
            <ColorField
              label="Cards / surfaces"
              value={draft.surface}
              disabled={isSaving}
              onChange={handleColor('surface')}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-text-primary">Headings</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              All three options use fonts already on the page, or the
              customer&apos;s device fonts. No extra download.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {FONT_PAIR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      fontPair: option.id,
                    }))
                  }
                  className={cn(
                    'rounded-[var(--radius-button)] border px-3 py-2.5 text-left',
                    draft.fontPair === option.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-black/10 hover:border-primary/40',
                  )}
                >
                  <span className="block text-sm font-semibold text-text-primary">
                    {option.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-text-secondary">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-text-primary">Corners</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {RADIUS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      radius: option.id,
                    }))
                  }
                  className={cn(
                    'rounded-[var(--radius-button)] border px-3 py-2.5 text-left',
                    draft.radius === option.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-black/10 hover:border-primary/40',
                  )}
                >
                  <span className="block text-sm font-semibold text-text-primary">
                    {option.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-text-secondary">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-[var(--radius-card)] border border-black/10 bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Preview
          </p>
          <p
            className="mt-3 font-heading text-lg font-bold text-primary"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {org.name || 'Your restaurant'}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Buttons, headings, and page colour follow this theme.
          </p>
          <div className="mt-4 rounded-[var(--radius-card)] bg-surface p-3 shadow-sm">
            <p className="text-sm font-semibold text-text-primary">
              Butter chicken
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Sample menu card
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm">
                Add to cart
              </Button>
              <Button type="button" size="sm" variant="secondary">
                View
              </Button>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <span
              className="h-6 w-6 rounded-full border border-black/10"
              style={{ backgroundColor: draft.primary }}
            />
            <span
              className="h-6 w-6 rounded-full border border-black/10"
              style={{ backgroundColor: draft.secondary }}
            />
            <span
              className="h-6 w-6 rounded-full border border-black/10"
              style={{ backgroundColor: draft.accent }}
            />
          </div>
        </aside>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={isSaving}
          onClick={() => void handleSave()}
        >
          {isSaving ? 'Saving…' : 'Save theme'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSaving || !isDirty}
          onClick={handleReset}
        >
          Reset
        </Button>
      </div>
    </section>
  )
}
