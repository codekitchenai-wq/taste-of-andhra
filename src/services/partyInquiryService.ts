import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import { supabase } from '@/services/supabaseClient'
import type { PartyInquiry, PartyMealPreference } from '@/types/PartyInquiry'
import { isValidEmail, isValidPhone } from '@/utils/validation'

export interface PartyInquiryInput {
  fullName: string
  email: string
  phone: string
  guestCount: number
  mealPreference: PartyMealPreference
  eventDate?: string
  addressLine1: string
  addressLine2?: string
  landmark: string
  city: string
  state: string
  pincode: string
  notes?: string
}

function mapPartyInquiry(row: Record<string, unknown>): PartyInquiry {
  return {
    id: row.id as string,
    full_name: row.full_name as string,
    email: row.email as string,
    phone: row.phone as string,
    guest_count: Number(row.guest_count),
    meal_preference: row.meal_preference as PartyMealPreference,
    event_date: (row.event_date as string | null) ?? null,
    address_line1: row.address_line1 as string,
    address_line2: (row.address_line2 as string | null) ?? null,
    landmark: row.landmark as string,
    city: row.city as string,
    state: row.state as string,
    pincode: row.pincode as string,
    notes: (row.notes as string | null) ?? null,
    status: row.status as PartyInquiry['status'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function submitPartyInquiry(
  input: PartyInquiryInput,
): Promise<ServiceResponse<PartyInquiry>> {
  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()
  const phone = input.phone.trim()
  const landmark = input.landmark.trim()
  const addressLine1 = input.addressLine1.trim()
  const city = input.city.trim()
  const state = input.state.trim()
  const pincode = input.pincode.trim()

  if (!fullName) {
    return createErrorResponse('Full name is required.')
  }

  if (!isValidEmail(email)) {
    return createErrorResponse('Please enter a valid email address.')
  }

  if (!isValidPhone(phone)) {
    return createErrorResponse('Phone number must be exactly 10 digits.')
  }

  if (!Number.isInteger(input.guestCount) || input.guestCount < 1) {
    return createErrorResponse('Enter how many members are expected (at least 1).')
  }

  if (input.guestCount > 2000) {
    return createErrorResponse('Please enter a guest count under 2000, or call us.')
  }

  if (!['veg', 'non_veg', 'mix'].includes(input.mealPreference)) {
    return createErrorResponse('Select veg, non-veg, or mix.')
  }

  if (!addressLine1) {
    return createErrorResponse('Address is required.')
  }

  if (!landmark) {
    return createErrorResponse('Nearest landmark is required.')
  }

  if (!city) {
    return createErrorResponse('City is required.')
  }

  if (!state) {
    return createErrorResponse('State is required.')
  }

  if (!/^\d{6}$/.test(pincode)) {
    return createErrorResponse('Enter a valid 6-digit pincode.')
  }

  const { data, error } = await supabase
    .from('party_inquiries')
    .insert({
      full_name: fullName,
      email,
      phone,
      guest_count: input.guestCount,
      meal_preference: input.mealPreference,
      event_date: input.eventDate?.trim() || null,
      address_line1: addressLine1,
      address_line2: input.addressLine2?.trim() || null,
      landmark,
      city,
      state,
      pincode,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    return createErrorResponse(
      'Unable to submit your party order enquiry. Please try again.',
      error.message,
    )
  }

  return createSuccessResponse(mapPartyInquiry(data))
}

export async function getAllPartyInquiries(): Promise<
  ServiceResponse<PartyInquiry[]>
> {
  const { data, error } = await supabase
    .from('party_inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return createErrorResponse('Unable to load party inquiries.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapPartyInquiry))
}

export async function updatePartyInquiryStatus(
  id: string,
  status: PartyInquiry['status'],
): Promise<ServiceResponse<PartyInquiry>> {
  const { data, error } = await supabase
    .from('party_inquiries')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return createErrorResponse(
      'Unable to update inquiry status.',
      error.message,
    )
  }

  return createSuccessResponse(mapPartyInquiry(data))
}
