export interface Branch {
  id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  pincode: string
  latitude: number | null
  longitude: number | null
  gstin: string | null
  is_active: boolean
  is_default: boolean
  opening_hours: string | null
  created_at: string
  updated_at: string
}

export interface BranchFormInput {
  name: string
  slug: string
  phone?: string
  email?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  pincode: string
  latitude?: number | null
  longitude?: number | null
  gstin?: string
  isActive?: boolean
  isDefault?: boolean
  openingHours?: string
}
