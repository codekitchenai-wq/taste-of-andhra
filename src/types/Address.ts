export interface Address {
  id: string
  user_id: string
  address_type: string
  full_name: string
  phone: string
  address_line1: string
  address_line2: string | null
  landmark: string | null
  city: string
  state: string
  pincode: string
  latitude: number | null
  longitude: number | null
  is_default: boolean
  created_at: string
}
