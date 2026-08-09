import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type {
  DishModifierGroup,
  Modifier,
  ModifierFormInput,
  ModifierGroup,
  ModifierGroupFormInput,
} from '@/types/Modifier'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { isSupabaseConfigured, supabase } from '@/services/supabaseClient'
import { insertWithOrgFallback } from '@/utils/insertWithOrgFallback'
import { mapModifier, mapModifierGroup } from '@/utils/modifiers'

function mapDbError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('duplicate key')) {
    return 'That modifier group is already attached to this dish.'
  }

  return message
}

export async function getDishModifierGroups(
  dishId: string,
  options?: { includeUnavailable?: boolean },
): Promise<ServiceResponse<DishModifierGroup[]>> {
  if (!isSupabaseConfigured) {
    return createErrorResponse(
      'Supabase is not configured. Add your real Project URL and anon key to .env.local, then restart the dev server.',
    )
  }

  const { data: links, error: linkError } = await supabase
    .from('dish_modifier_groups')
    .select('*')
    .eq('dish_id', dishId)
    .order('display_order', { ascending: true })

  if (linkError) {
    if (
      linkError.code === 'PGRST205' ||
      linkError.message.toLowerCase().includes('could not find the table')
    ) {
      return createSuccessResponse([])
    }

    return createErrorResponse(
      'Unable to load dish modifiers.',
      linkError.message,
    )
  }

  if (!links?.length) {
    return createSuccessResponse([])
  }

  const groupIds = links.map((link) => link.modifier_group_id as string)

  let groupQuery = supabase
    .from('modifier_groups')
    .select('*')
    .in('id', groupIds)

  if (!options?.includeUnavailable) {
    groupQuery = groupQuery.eq('is_active', true)
  }

  const { data: groups, error: groupError } = await groupQuery

  if (groupError) {
    return createErrorResponse(
      'Unable to load modifier groups.',
      groupError.message,
    )
  }

  let modifierQuery = supabase
    .from('modifiers')
    .select('*')
    .in('modifier_group_id', groupIds)
    .order('display_order', { ascending: true })

  if (!options?.includeUnavailable) {
    modifierQuery = modifierQuery.eq('is_available', true)
  }

  const { data: modifiers, error: modifierError } = await modifierQuery

  if (modifierError) {
    return createErrorResponse(
      'Unable to load modifiers.',
      modifierError.message,
    )
  }

  const groupMap = new Map(
    (groups ?? []).map((row) => [row.id as string, mapModifierGroup(row)]),
  )
  const modifiersByGroup = new Map<string, Modifier[]>()

  for (const row of modifiers ?? []) {
    const mapped = mapModifier(row)
    const list = modifiersByGroup.get(mapped.modifier_group_id) ?? []
    list.push(mapped)
    modifiersByGroup.set(mapped.modifier_group_id, list)
  }

  const result: DishModifierGroup[] = []

  for (const link of links) {
    const group = groupMap.get(link.modifier_group_id as string)
    if (!group) continue

    result.push({
      ...group,
      link_id: link.id as string,
      link_display_order: Number(link.display_order ?? 0),
      modifiers: modifiersByGroup.get(group.id) ?? [],
    })
  }

  result.sort((a, b) => a.link_display_order - b.link_display_order)

  return createSuccessResponse(result)
}

export async function createModifierGroupForDish(
  dishId: string,
  input: ModifierGroupFormInput,
): Promise<ServiceResponse<DishModifierGroup>> {
  const name = input.name.trim()

  if (!name) {
    return createErrorResponse('Modifier group name is required.')
  }

  const minSelection = input.minSelection ?? 0
  const maxSelection =
    input.maxSelection === undefined ? null : input.maxSelection

  if (minSelection < 0) {
    return createErrorResponse('Minimum selection cannot be negative.')
  }

  if (maxSelection !== null && maxSelection < Math.max(minSelection, 1)) {
    return createErrorResponse(
      'Maximum selection must be at least the minimum selection.',
    )
  }

  const { data: dish, error: dishError } = await supabase
    .from('dishes')
    .select('id, organization_id')
    .eq('id', dishId)
    .maybeSingle()

  if (dishError) {
    return createErrorResponse('Unable to verify dish.', dishError.message)
  }

  if (!dish) {
    return createErrorResponse('Dish not found.')
  }

  const organizationId =
    (dish.organization_id as string) || DEFAULT_ORGANIZATION_ID

  const { data: group, error: groupError } = await insertWithOrgFallback(
    supabase,
    'modifier_groups',
    {
      organization_id: organizationId,
      name,
      min_selection: minSelection,
      max_selection: maxSelection,
      display_order: input.displayOrder ?? 0,
      is_active: input.isActive ?? true,
    },
  )

  if (groupError || !group) {
    return createErrorResponse(
      mapDbError(groupError?.message ?? 'Unable to create modifier group.'),
      groupError?.message,
    )
  }

  const { data: link, error: linkError } = await insertWithOrgFallback(
    supabase,
    'dish_modifier_groups',
    {
      organization_id: organizationId,
      dish_id: dishId,
      modifier_group_id: group.id,
      display_order: input.displayOrder ?? 0,
    },
  )

  if (linkError || !link) {
    await supabase.from('modifier_groups').delete().eq('id', group.id)
    return createErrorResponse(
      mapDbError(linkError?.message ?? 'Unable to attach modifier group.'),
      linkError?.message,
    )
  }

  return createSuccessResponse({
    ...mapModifierGroup(group),
    link_id: link.id as string,
    link_display_order: Number(link.display_order ?? 0),
    modifiers: [],
  })
}

export async function updateModifierGroup(
  groupId: string,
  input: Partial<ModifierGroupFormInput>,
): Promise<ServiceResponse<ModifierGroup>> {
  const updates: Record<string, unknown> = {}

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) {
      return createErrorResponse('Modifier group name is required.')
    }
    updates.name = name
  }

  if (input.minSelection !== undefined) {
    updates.min_selection = input.minSelection
  }

  if (input.maxSelection !== undefined) {
    updates.max_selection = input.maxSelection
  }

  if (input.displayOrder !== undefined) {
    updates.display_order = input.displayOrder
  }

  if (input.isActive !== undefined) {
    updates.is_active = input.isActive
  }

  if (Object.keys(updates).length === 0) {
    return createErrorResponse('No changes provided.')
  }

  const { data, error } = await supabase
    .from('modifier_groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single()

  if (error) {
    return createErrorResponse(mapDbError(error.message), error.message)
  }

  return createSuccessResponse(mapModifierGroup(data))
}

export async function deactivateModifierGroup(
  groupId: string,
): Promise<ServiceResponse<null>> {
  const { error } = await supabase
    .from('modifier_groups')
    .update({ is_active: false })
    .eq('id', groupId)

  if (error) {
    return createErrorResponse('Unable to deactivate modifier group.', error.message)
  }

  return createSuccessResponse(null)
}

export async function createModifier(
  groupId: string,
  input: ModifierFormInput,
): Promise<ServiceResponse<Modifier>> {
  const name = input.name.trim()

  if (!name) {
    return createErrorResponse('Modifier name is required.')
  }

  const { data: group, error: groupError } = await supabase
    .from('modifier_groups')
    .select('id, organization_id')
    .eq('id', groupId)
    .maybeSingle()

  if (groupError) {
    return createErrorResponse('Unable to verify group.', groupError.message)
  }

  if (!group) {
    return createErrorResponse('Modifier group not found.')
  }

  const { data, error } = await insertWithOrgFallback(supabase, 'modifiers', {
    organization_id:
      (group.organization_id as string) || DEFAULT_ORGANIZATION_ID,
    modifier_group_id: groupId,
    name,
    price_delta: input.priceDelta ?? 0,
    display_order: input.displayOrder ?? 0,
    is_available: input.isAvailable ?? true,
  })

  if (error || !data) {
    return createErrorResponse(
      mapDbError(error?.message ?? 'Unable to create modifier.'),
      error?.message,
    )
  }

  return createSuccessResponse(mapModifier(data))
}

export async function updateModifier(
  modifierId: string,
  input: Partial<ModifierFormInput>,
): Promise<ServiceResponse<Modifier>> {
  const updates: Record<string, unknown> = {}

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) {
      return createErrorResponse('Modifier name is required.')
    }
    updates.name = name
  }

  if (input.priceDelta !== undefined) {
    updates.price_delta = input.priceDelta
  }

  if (input.displayOrder !== undefined) {
    updates.display_order = input.displayOrder
  }

  if (input.isAvailable !== undefined) {
    updates.is_available = input.isAvailable
  }

  if (Object.keys(updates).length === 0) {
    return createErrorResponse('No changes provided.')
  }

  const { data, error } = await supabase
    .from('modifiers')
    .update(updates)
    .eq('id', modifierId)
    .select()
    .single()

  if (error) {
    return createErrorResponse(mapDbError(error.message), error.message)
  }

  return createSuccessResponse(mapModifier(data))
}

export async function deactivateModifier(
  modifierId: string,
): Promise<ServiceResponse<null>> {
  const { error } = await supabase
    .from('modifiers')
    .update({ is_available: false })
    .eq('id', modifierId)

  if (error) {
    return createErrorResponse('Unable to deactivate modifier.', error.message)
  }

  return createSuccessResponse(null)
}
