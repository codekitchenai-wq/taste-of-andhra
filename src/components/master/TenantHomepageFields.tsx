import { Input } from '@/components/ui/Input'
import { PLATFORM_ROOT_DOMAIN } from '@/constants/PLATFORM'
import type { HomepageMode } from '@/types/Organization'
import {
  platformSubdomainUrl,
  type TenantHomepageDraft,
} from '@/utils/tenantHomepage'

const HOMEPAGE_OPTIONS: Array<{
  mode: HomepageMode
  title: string
  hint: string
}> = [
  {
    mode: 'set_later',
    title: 'Add later',
    hint: 'Skip for now. You can add or change this anytime on the tenant page.',
  },
  {
    mode: 'platform_subdomain',
    title: 'Platform subdomain',
    hint: `Add now: {slug}.${PLATFORM_ROOT_DOMAIN}`,
  },
  {
    mode: 'custom_domain',
    title: 'Custom domain',
    hint: 'Add now: their own domain, e.g. order.chopsticks.com',
  },
  {
    mode: 'external_link',
    title: 'Other homepage link',
    hint: 'Add now: existing site, Instagram, Linktree, or any URL',
  },
]

interface TenantHomepageFieldsProps {
  slug: string
  draft: TenantHomepageDraft
  onChange: (draft: TenantHomepageDraft) => void
  radioName?: string
  heading?: string
}

export function TenantHomepageFields({
  slug,
  draft,
  onChange,
  radioName = 'homepage-mode',
  heading = 'Public homepage',
}: TenantHomepageFieldsProps) {
  const preview =
    draft.mode === 'platform_subdomain'
      ? platformSubdomainUrl(slug)
      : draft.mode === 'custom_domain'
        ? draft.customDomain.trim()
          ? `https://${draft.customDomain.trim().replace(/^https?:\/\//i, '')}`
          : ''
        : draft.mode === 'external_link'
          ? draft.externalUrl.trim()
          : ''

  return (
    <section className="space-y-4 sm:col-span-2">
      <div>
        <h2 className="text-lg font-semibold">{heading}</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Optional at onboarding. Add a subdomain, custom domain, or any other
          link now — or skip and change it later without recreating the
          restaurant. The URL slug stays the internal tenant key.
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {HOMEPAGE_OPTIONS.map((option) => (
          <li key={option.mode}>
            <label className="flex h-full cursor-pointer items-start gap-2 rounded-[var(--radius-card)] border border-black/10 bg-surface px-3 py-3 text-sm">
              <input
                type="radio"
                name={radioName}
                className="mt-1"
                checked={draft.mode === option.mode}
                onChange={() => onChange({ ...draft, mode: option.mode })}
              />
              <span>
                <span className="font-medium">{option.title}</span>
                <span className="mt-0.5 block text-xs text-text-secondary">
                  {option.hint.replace('{slug}', slug || 'slug')}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {draft.mode === 'custom_domain' && (
        <Input
          label="Custom domain"
          placeholder="order.chopsticks.com"
          value={draft.customDomain}
          onChange={(event) =>
            onChange({ ...draft, customDomain: event.target.value })
          }
          required
        />
      )}

      {draft.mode === 'external_link' && (
        <Input
          label="Homepage link"
          placeholder="https://instagram.com/chopsticksblr"
          value={draft.externalUrl}
          onChange={(event) =>
            onChange({ ...draft, externalUrl: event.target.value })
          }
          required
        />
      )}

      {draft.mode === 'set_later' ? (
        <p className="text-sm text-text-secondary">
          No customer homepage yet. Open this restaurant later to add or
          change it.
        </p>
      ) : preview ? (
        <p className="text-sm text-text-secondary">
          Customer home:{' '}
          <span className="break-all font-mono text-text-primary">{preview}</span>
        </p>
      ) : null}
    </section>
  )
}
