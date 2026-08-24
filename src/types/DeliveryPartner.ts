export interface DeliveryPartner {
  id: string
  organization_id: string
  branch_id: string | null
  full_name: string
  phone: string
  is_active: boolean
  notes: string | null
  user_id: string | null
  login_email: string | null
  login_active: boolean | null
  has_login: boolean
  created_at: string
  updated_at: string
}

export interface DeliveryPartnerFormInput {
  fullName: string
  phone: string
  notes?: string
  isActive?: boolean
  branchId?: string | null
  /** Login email for /delivery. Required when creating a new partner. */
  email?: string
  /** Login password. Required on create; optional on edit (leave blank to keep). */
  password?: string
}
