import type {
  DishModifierGroup,
  Modifier,
  ModifierGroup,
  ModifierSelectionSnapshot,
} from '@/types/Modifier'

export function mapModifierGroup(row: Record<string, unknown>): ModifierGroup {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    name: row.name as string,
    min_selection: Number(row.min_selection ?? 0),
    max_selection:
      row.max_selection === null || row.max_selection === undefined
        ? null
        : Number(row.max_selection),
    display_order: Number(row.display_order ?? 0),
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function mapModifier(row: Record<string, unknown>): Modifier {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    modifier_group_id: row.modifier_group_id as string,
    name: row.name as string,
    price_delta: Number(row.price_delta ?? 0),
    display_order: Number(row.display_order ?? 0),
    is_available: Boolean(row.is_available),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function normalizeModifierSnapshots(
  snapshots: ModifierSelectionSnapshot[],
): ModifierSelectionSnapshot[] {
  return [...snapshots]
    .map((item) => ({
      group_id: item.group_id,
      group_name: item.group_name,
      modifier_id: item.modifier_id,
      modifier_name: item.modifier_name,
      price_delta: Number(item.price_delta) || 0,
    }))
    .sort((a, b) => {
      const groupCmp = a.group_id.localeCompare(b.group_id)
      if (groupCmp !== 0) return groupCmp
      return a.modifier_id.localeCompare(b.modifier_id)
    })
}

export function modifierSnapshotsEqual(
  a: ModifierSelectionSnapshot[],
  b: ModifierSelectionSnapshot[],
): boolean {
  const left = normalizeModifierSnapshots(a)
  const right = normalizeModifierSnapshots(b)

  if (left.length !== right.length) return false

  return left.every(
    (item, index) =>
      item.group_id === right[index].group_id &&
      item.modifier_id === right[index].modifier_id &&
      item.price_delta === right[index].price_delta,
  )
}

export function sumModifierDeltas(
  snapshots: ModifierSelectionSnapshot[],
): number {
  return snapshots.reduce((sum, item) => sum + (Number(item.price_delta) || 0), 0)
}

export function calculateUnitPrice(
  dishPrice: number,
  snapshots: ModifierSelectionSnapshot[],
): number {
  return Number(dishPrice) + sumModifierDeltas(snapshots)
}

export function parseModifierSnapshots(
  value: unknown,
): ModifierSelectionSnapshot[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object',
    )
    .map((item) => ({
      group_id: String(item.group_id ?? ''),
      group_name: String(item.group_name ?? ''),
      modifier_id: String(item.modifier_id ?? ''),
      modifier_name: String(item.modifier_name ?? ''),
      price_delta: Number(item.price_delta) || 0,
    }))
    .filter((item) => item.group_id && item.modifier_id)
}

/**
 * Validate selected modifier IDs against dish groups.
 * Returns normalized snapshots or an error message.
 */
export function buildModifierSnapshots(
  groups: DishModifierGroup[],
  selectedModifierIds: string[],
): { ok: true; snapshots: ModifierSelectionSnapshot[] } | { ok: false; message: string } {
  const selected = new Set(selectedModifierIds)
  const snapshots: ModifierSelectionSnapshot[] = []

  for (const group of groups) {
    if (!group.is_active) continue

    const available = group.modifiers.filter((m) => m.is_available)
    const chosen = available.filter((m) => selected.has(m.id))

    if (chosen.length < group.min_selection) {
      return {
        ok: false,
        message: `Select at least ${group.min_selection} option(s) for ${group.name}.`,
      }
    }

    if (
      group.max_selection !== null &&
      chosen.length > group.max_selection
    ) {
      return {
        ok: false,
        message: `Select at most ${group.max_selection} option(s) for ${group.name}.`,
      }
    }

    for (const modifier of chosen) {
      snapshots.push({
        group_id: group.id,
        group_name: group.name,
        modifier_id: modifier.id,
        modifier_name: modifier.name,
        price_delta: modifier.price_delta,
      })
      selected.delete(modifier.id)
    }
  }

  if (selected.size > 0) {
    return {
      ok: false,
      message: 'One or more selected options are invalid for this dish.',
    }
  }

  return { ok: true, snapshots: normalizeModifierSnapshots(snapshots) }
}
