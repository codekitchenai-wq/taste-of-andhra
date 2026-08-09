/** Selected modifier line stored on cart/order items (immutable snapshot shape). */
export interface ModifierSelectionSnapshot {
  group_id: string
  group_name: string
  modifier_id: string
  modifier_name: string
  price_delta: number
}

export interface ModifierGroup {
  id: string
  organization_id: string
  name: string
  min_selection: number
  max_selection: number | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Modifier {
  id: string
  organization_id: string
  modifier_group_id: string
  name: string
  price_delta: number
  display_order: number
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface DishModifierGroupLink {
  id: string
  organization_id: string
  dish_id: string
  modifier_group_id: string
  display_order: number
  created_at: string
}

/** Group attached to a dish, with its options (customer + admin views). */
export interface DishModifierGroup extends ModifierGroup {
  link_id: string
  link_display_order: number
  modifiers: Modifier[]
}

export interface ModifierGroupFormInput {
  name: string
  minSelection?: number
  maxSelection?: number | null
  displayOrder?: number
  isActive?: boolean
}

export interface ModifierFormInput {
  name: string
  priceDelta?: number
  displayOrder?: number
  isAvailable?: boolean
}
