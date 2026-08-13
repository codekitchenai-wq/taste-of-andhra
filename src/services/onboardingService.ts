import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import {
  DEFAULT_TRIAL_DAYS,
  STARTER_PLAN_ID,
  expandSelectedAddons,
} from '@/constants/ONBOARDING'
import { generateSlug } from '@/utils/slug'
import { parseMenuCsv } from '@/utils/parseMenuCsv'
import { supabase } from '@/services/supabaseClient'

export interface OnboardRestaurantInput {
  name: string
  slug?: string
  publicPhone: string
  city: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  trialDays?: number
  addonKeys: string[]
}

export interface OnboardRestaurantResult {
  organizationId: string
  name: string
  slug: string
  ownerEmail: string
  ownerName: string
  existingUser: boolean
  temporaryPassword: string | null
  inviteError: string | null
  enabledAddons: string[]
}

export interface MenuImportResult {
  categoriesCreated: number
  dishesCreated: number
  errors: string[]
}

function uniqueSlug(base: string, suffix: string): string {
  const slug = generateSlug(base)
  if (!slug) return `restaurant-${suffix.slice(0, 8)}`
  return slug
}

export async function onboardRestaurant(
  input: OnboardRestaurantInput,
): Promise<ServiceResponse<OnboardRestaurantResult>> {
  const name = input.name.trim()
  const ownerEmail = input.ownerEmail.trim().toLowerCase()
  const ownerName = input.ownerName.trim()
  const ownerPhone = input.ownerPhone.trim()
  const publicPhone = input.publicPhone.trim()
  const city = input.city.trim()
  const trialDays = Math.max(1, input.trialDays ?? DEFAULT_TRIAL_DAYS)

  if (!name || !ownerEmail || !ownerName || !ownerPhone || !publicPhone || !city) {
    return createErrorResponse(
      'Name, city, public phone, and owner name/email/phone are required.',
    )
  }

  const slug = uniqueSlug(
    input.slug?.trim() || name,
    crypto.randomUUID(),
  )
  const enabledAddons = expandSelectedAddons(input.addonKeys)

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug,
      status: 'trialing',
      phone: publicPhone,
      email: ownerEmail,
      address: city,
      branding: {},
      opening_hours: {},
      settings: {
        onboarded_by: 'master',
        owner_name: ownerName,
        owner_phone: ownerPhone,
      },
    })
    .select('id, name, slug')
    .single()

  if (orgError || !org) {
    if (orgError?.message.toLowerCase().includes('duplicate')) {
      return createErrorResponse(
        'That URL slug is already taken. Choose another.',
        orgError.message,
      )
    }
    return createErrorResponse(
      orgError?.message || 'Unable to create restaurant.',
      orgError?.message,
    )
  }

  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + trialDays)

  const { error: subError } = await supabase.from('subscriptions').insert({
    organization_id: org.id,
    plan_id: STARTER_PLAN_ID,
    status: 'trialing',
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd.toISOString(),
    provider: 'manual',
    provider_ref: `onboarding-${slug}`,
  })

  if (subError) {
    return createErrorResponse(
      `Restaurant created but subscription failed: ${subError.message}`,
      subError.message,
    )
  }

  if (enabledAddons.length > 0) {
    const { error: entError } = await supabase
      .from('organization_entitlements')
      .upsert(
        enabledAddons.map((featureKey) => ({
          organization_id: org.id,
          feature_key: featureKey,
          enabled: true,
          source: 'manual' as const,
          notes: 'Set during Master onboarding',
        })),
        { onConflict: 'organization_id,feature_key' },
      )

    if (entError) {
      return createErrorResponse(
        `Restaurant created but features failed: ${entError.message}`,
        entError.message,
      )
    }
  }

  const invite = await supabase.functions.invoke('master-onboard-owner', {
    body: {
      organizationId: org.id,
      ownerEmail,
      ownerName,
      ownerPhone,
    },
  })

  let temporaryPassword: string | null = null
  let existingUser = false
  let inviteError: string | null = null

  if (invite.error) {
    inviteError =
      invite.error.message ||
      'Owner login was not created. Deploy the master-onboard-owner function.'
  } else if (invite.data && typeof invite.data === 'object') {
    const payload = invite.data as {
      error?: string
      temporaryPassword?: string | null
      existingUser?: boolean
    }
    if (payload.error) {
      inviteError = payload.error
    } else {
      temporaryPassword = payload.temporaryPassword ?? null
      existingUser = Boolean(payload.existingUser)
    }
  }

  return createSuccessResponse({
    organizationId: org.id as string,
    name: org.name as string,
    slug: org.slug as string,
    ownerEmail,
    ownerName,
    existingUser,
    temporaryPassword,
    inviteError,
    enabledAddons,
  })
}

export async function importMenuCsv(
  organizationId: string,
  csvText: string,
  publishImmediately: boolean,
): Promise<ServiceResponse<MenuImportResult>> {
  const parsed = parseMenuCsv(csvText)
  if (parsed.rows.length === 0) {
    return createErrorResponse(
      parsed.errors[0] || 'No valid menu rows found.',
    )
  }

  const { data: existingCategories, error: catLoadError } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('organization_id', organizationId)

  if (catLoadError) {
    return createErrorResponse(
      'Unable to load existing categories.',
      catLoadError.message,
    )
  }

  const categoryIds = new Map<string, string>()
  for (const row of existingCategories ?? []) {
    categoryIds.set(String(row.name).trim().toLowerCase(), String(row.id))
  }

  let categoriesCreated = 0
  const uniqueCategories = [...new Set(parsed.rows.map((row) => row.category))]

  for (const [index, categoryName] of uniqueCategories.entries()) {
    const key = categoryName.toLowerCase()
    if (categoryIds.has(key)) continue

    const { data, error } = await supabase
      .from('categories')
      .insert({
        organization_id: organizationId,
        name: categoryName,
        slug: generateSlug(`${categoryName}-${index + 1}`),
        display_order: index + 1,
        is_active: true,
      })
      .select('id, name')
      .single()

    if (error || !data) {
      parsed.errors.push(
        `Category "${categoryName}": ${error?.message || 'create failed'}`,
      )
      continue
    }
    categoryIds.set(key, String(data.id))
    categoriesCreated += 1
  }

  let dishesCreated = 0
  for (const row of parsed.rows) {
    const categoryId = categoryIds.get(row.category.toLowerCase())
    if (!categoryId) {
      parsed.errors.push(
        `Line ${row.lineNumber}: category "${row.category}" was not created.`,
      )
      continue
    }

    const slug = generateSlug(`${row.name}-${row.lineNumber}`)
    const { error } = await supabase.from('dishes').insert({
      organization_id: organizationId,
      category_id: categoryId,
      name: row.name,
      slug,
      description: row.description || null,
      price: row.price,
      is_veg: row.isVeg,
      spice_level: row.spiceLevel,
      preparation_time: row.preparationTimeMinutes,
      is_available: publishImmediately ? row.isAvailable : false,
      is_featured: row.isFeatured,
    })

    if (error) {
      parsed.errors.push(`Line ${row.lineNumber} (${row.name}): ${error.message}`)
      continue
    }
    dishesCreated += 1
  }

  if (dishesCreated === 0) {
    return createErrorResponse(
      parsed.errors[0] || 'No dishes were imported.',
    )
  }

  return createSuccessResponse({
    categoriesCreated,
    dishesCreated,
    errors: parsed.errors,
  })
}
