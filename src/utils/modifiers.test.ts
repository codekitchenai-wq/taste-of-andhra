import { describe, expect, it } from 'vitest'
import type { DishModifierGroup } from '@/types/Modifier'
import {
  buildModifierSnapshots,
  calculateUnitPrice,
  modifierSnapshotsEqual,
  normalizeModifierSnapshots,
  sumModifierDeltas,
} from '@/utils/modifiers'

function group(
  overrides: Partial<DishModifierGroup> &
    Pick<DishModifierGroup, 'id' | 'name' | 'min_selection' | 'modifiers'>,
): DishModifierGroup {
  return {
    organization_id: 'org',
    max_selection: overrides.max_selection ?? null,
    display_order: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
    link_id: 'link',
    link_display_order: 0,
    ...overrides,
  }
}

describe('modifiers utils', () => {
  const spice = group({
    id: 'g-spice',
    name: 'Spice Level',
    min_selection: 1,
    max_selection: 1,
    modifiers: [
      {
        id: 'm-mild',
        organization_id: 'org',
        modifier_group_id: 'g-spice',
        name: 'Mild',
        price_delta: 0,
        display_order: 0,
        is_available: true,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'm-hot',
        organization_id: 'org',
        modifier_group_id: 'g-spice',
        name: 'Hot',
        price_delta: 10,
        display_order: 1,
        is_available: true,
        created_at: '',
        updated_at: '',
      },
    ],
  })

  const addons = group({
    id: 'g-addons',
    name: 'Add-ons',
    min_selection: 0,
    max_selection: 2,
    modifiers: [
      {
        id: 'm-egg',
        organization_id: 'org',
        modifier_group_id: 'g-addons',
        name: 'Egg',
        price_delta: 20,
        display_order: 0,
        is_available: true,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'm-raita',
        organization_id: 'org',
        modifier_group_id: 'g-addons',
        name: 'Raita',
        price_delta: 30,
        display_order: 1,
        is_available: true,
        created_at: '',
        updated_at: '',
      },
    ],
  })

  it('requires min selection', () => {
    const result = buildModifierSnapshots([spice, addons], [])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain('Spice Level')
    }
  })

  it('builds snapshots and unit price', () => {
    const result = buildModifierSnapshots([spice, addons], ['m-hot', 'm-egg'])
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(sumModifierDeltas(result.snapshots)).toBe(30)
    expect(calculateUnitPrice(220, result.snapshots)).toBe(250)
  })

  it('compares snapshots ignoring order', () => {
    const a = normalizeModifierSnapshots([
      {
        group_id: 'g2',
        group_name: 'B',
        modifier_id: 'm2',
        modifier_name: 'Y',
        price_delta: 1,
      },
      {
        group_id: 'g1',
        group_name: 'A',
        modifier_id: 'm1',
        modifier_name: 'X',
        price_delta: 2,
      },
    ])
    const b = normalizeModifierSnapshots([
      {
        group_id: 'g1',
        group_name: 'A',
        modifier_id: 'm1',
        modifier_name: 'X',
        price_delta: 2,
      },
      {
        group_id: 'g2',
        group_name: 'B',
        modifier_id: 'm2',
        modifier_name: 'Y',
        price_delta: 1,
      },
    ])

    expect(modifierSnapshotsEqual(a, b)).toBe(true)
  })
})
