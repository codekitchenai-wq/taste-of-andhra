export type PartyMealPreference = 'veg' | 'non_veg' | 'mix'

export type PartyInquiryStatus = 'new' | 'contacted' | 'quoted' | 'closed'

export interface PartyInquiry {
  id: string
  organization_id: string
  full_name: string
  email: string
  phone: string
  guest_count: number
  meal_preference: PartyMealPreference
  event_date: string | null
  address_line1: string
  address_line2: string | null
  landmark: string
  city: string
  state: string
  pincode: string
  notes: string | null
  status: PartyInquiryStatus
  created_at: string
  updated_at: string
}
