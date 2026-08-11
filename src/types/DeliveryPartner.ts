export interface DeliveryPartner {
  id: string
  organization_id: string
  branch_id: string | null
  full_name: string
  phone: string
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DeliveryPartnerFormInput {
  fullName: string
  phone: string
  notes?: string
  isActive?: boolean
  branchId?: string | null
}
