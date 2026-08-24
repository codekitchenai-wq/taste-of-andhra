// Restaurant admin: create / update / disable / delete delivery partner logins.
//
// Deploy: supabase functions deploy admin-delivery-partner --project-ref qixpsqlifwsztncjevgl
//
// Body:
//   { action: 'list', organizationId }
//   { action: 'upsert', organizationId, partnerId?, fullName, phone, notes?,
//     branchId?, isActive?, email?, password? }
//   { action: 'set_active', organizationId, partnerId, isActive }
//   { action: 'set_password', organizationId, partnerId, password }
//   { action: 'delete', organizationId, partnerId, deleteLogin?: true }

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'

type Action = 'list' | 'upsert' | 'set_active' | 'set_password' | 'delete'

interface RequestBody {
  action?: Action
  organizationId?: string
  partnerId?: string
  fullName?: string
  phone?: string
  notes?: string | null
  branchId?: string | null
  isActive?: boolean
  email?: string
  password?: string
  deleteLogin?: boolean
}

function normalizePhone(input: string | null | undefined): string {
  return (input ?? '').replace(/\D/g, '').slice(-10)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) throw error
    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    )
    if (found) return found
    if (data.users.length < 200) break
  }
  return null
}

async function assertOrgAdmin(
  admin: ReturnType<typeof createClient>,
  userId: string,
  organizationId: string,
): Promise<Response | null> {
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role === 'platform_master' || profile?.role === 'admin') {
    return null
  }

  const { data: membership } = await admin
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('role', ['restaurant_owner', 'restaurant_admin'])
    .maybeSingle()

  if (!membership) {
    return errorResponse(
      'Only restaurant admins can manage delivery partner logins.',
      403,
    )
  }

  return null
}

function mapPartner(
  row: Record<string, unknown>,
  login: { email: string | null; is_active: boolean | null } | null,
) {
  return {
    id: row.id,
    organization_id: row.organization_id,
    branch_id: row.branch_id ?? null,
    full_name: row.full_name,
    phone: row.phone,
    is_active: Boolean(row.is_active),
    notes: row.notes ?? null,
    user_id: (row.user_id as string | null) ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    login_email: login?.email ?? null,
    login_active: login?.is_active ?? null,
    has_login: Boolean(row.user_id),
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405)
  }

  const authHeader = request.headers.get('Authorization') ?? ''
  if (!authHeader) {
    return errorResponse('Missing authorization header.', 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return errorResponse('Server is missing Supabase credentials.', 500)
  }

  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return errorResponse('Invalid request body.')
  }

  const action = body.action
  const organizationId = body.organizationId?.trim()
  if (!action) return errorResponse('action is required.')
  if (!organizationId) return errorResponse('organizationId is required.')

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) return errorResponse('Please sign in.', 401)

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const denied = await assertOrgAdmin(admin, user.id, organizationId)
  if (denied) return denied

  if (action === 'list') {
    const { data: partners, error } = await admin
      .from('delivery_partners')
      .select('*')
      .eq('organization_id', organizationId)
      .order('is_active', { ascending: false })
      .order('full_name', { ascending: true })

    if (error) return errorResponse(error.message, 500)

    const userIds = (partners ?? [])
      .map((row) => row.user_id as string | null)
      .filter((id): id is string => Boolean(id))

    const loginById = new Map<
      string,
      { email: string | null; is_active: boolean | null }
    >()

    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, email, is_active')
        .in('id', userIds)
      for (const profile of profiles ?? []) {
        loginById.set(profile.id as string, {
          email: (profile.email as string | null) ?? null,
          is_active:
            profile.is_active == null ? null : Boolean(profile.is_active),
        })
      }
    }

    return jsonResponse({
      data: (partners ?? []).map((row) =>
        mapPartner(
          row as Record<string, unknown>,
          row.user_id
            ? (loginById.get(row.user_id as string) ?? null)
            : null,
        ),
      ),
    })
  }

  if (action === 'set_active') {
    const partnerId = body.partnerId?.trim()
    if (!partnerId) return errorResponse('partnerId is required.')
    if (typeof body.isActive !== 'boolean') {
      return errorResponse('isActive is required.')
    }

    const { data: partner, error: loadError } = await admin
      .from('delivery_partners')
      .select('*')
      .eq('id', partnerId)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (loadError) return errorResponse(loadError.message, 500)
    if (!partner) return errorResponse('Delivery partner not found.', 404)

    const { data: updated, error: updateError } = await admin
      .from('delivery_partners')
      .update({ is_active: body.isActive })
      .eq('id', partnerId)
      .select('*')
      .single()

    if (updateError) return errorResponse(updateError.message, 500)

    if (partner.user_id) {
      await admin
        .from('profiles')
        .update({ is_active: body.isActive })
        .eq('id', partner.user_id)
        .eq('role', 'delivery')
    }

    let login = null
    if (updated.user_id) {
      const { data: profile } = await admin
        .from('profiles')
        .select('email, is_active')
        .eq('id', updated.user_id)
        .maybeSingle()
      login = profile
        ? {
            email: (profile.email as string | null) ?? null,
            is_active:
              profile.is_active == null ? null : Boolean(profile.is_active),
          }
        : null
    }

    return jsonResponse({
      data: mapPartner(updated as Record<string, unknown>, login),
    })
  }

  if (action === 'set_password') {
    const partnerId = body.partnerId?.trim()
    const password = body.password ?? ''
    if (!partnerId) return errorResponse('partnerId is required.')
    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters.')
    }

    const { data: partner, error: loadError } = await admin
      .from('delivery_partners')
      .select('*')
      .eq('id', partnerId)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (loadError) return errorResponse(loadError.message, 500)
    if (!partner) return errorResponse('Delivery partner not found.', 404)
    if (!partner.user_id) {
      return errorResponse(
        'This partner has no login yet. Edit the partner and set an email and password first.',
      )
    }

    const { error: authError } = await admin.auth.admin.updateUserById(
      partner.user_id as string,
      { password, email_confirm: true },
    )
    if (authError) return errorResponse(authError.message, 500)

    return jsonResponse({ data: { ok: true } })
  }

  if (action === 'delete') {
    const partnerId = body.partnerId?.trim()
    if (!partnerId) return errorResponse('partnerId is required.')

    const { data: partner, error: loadError } = await admin
      .from('delivery_partners')
      .select('*')
      .eq('id', partnerId)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (loadError) return errorResponse(loadError.message, 500)
    if (!partner) return errorResponse('Delivery partner not found.', 404)

    const loginUserId = partner.user_id as string | null
    const deleteLogin = body.deleteLogin !== false

    const { error: deleteError } = await admin
      .from('delivery_partners')
      .delete()
      .eq('id', partnerId)

    if (deleteError) return errorResponse(deleteError.message, 500)

    if (deleteLogin && loginUserId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', loginUserId)
        .maybeSingle()

      if (profile?.role === 'delivery') {
        await admin
          .from('organization_members')
          .delete()
          .eq('organization_id', organizationId)
          .eq('user_id', loginUserId)
          .eq('role', 'delivery')

        const { error: authDeleteError } =
          await admin.auth.admin.deleteUser(loginUserId)
        if (authDeleteError) {
          return errorResponse(
            `Partner removed, but login could not be deleted: ${authDeleteError.message}`,
            500,
          )
        }
      }
    }

    return jsonResponse({ data: { ok: true } })
  }

  if (action === 'upsert') {
    const fullName = body.fullName?.trim() ?? ''
    const phone = normalizePhone(body.phone)
    const email = body.email?.trim().toLowerCase() ?? ''
    const password = body.password ?? ''
    const partnerId = body.partnerId?.trim() || null

    if (fullName.length < 2) {
      return errorResponse('Partner name is required.')
    }
    if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
      return errorResponse('Enter a valid 10-digit mobile number.')
    }

    if (email && !isValidEmail(email)) {
      return errorResponse('Enter a valid email address for the login.')
    }
    if (!partnerId && (!email || password.length < 6)) {
      return errorResponse(
        'Email and a password (at least 6 characters) are required to create a delivery login.',
      )
    }
    if (partnerId && password && password.length < 6) {
      return errorResponse('Password must be at least 6 characters.')
    }

    let existing: Record<string, unknown> | null = null
    if (partnerId) {
      const { data, error } = await admin
        .from('delivery_partners')
        .select('*')
        .eq('id', partnerId)
        .eq('organization_id', organizationId)
        .maybeSingle()
      if (error) return errorResponse(error.message, 500)
      if (!data) return errorResponse('Delivery partner not found.', 404)
      existing = data as Record<string, unknown>
    }

    const rosterPayload = {
      organization_id: organizationId,
      full_name: fullName,
      phone,
      notes: body.notes?.trim() || null,
      branch_id: body.branchId || null,
      is_active: body.isActive ?? true,
    }

    let partnerRow: Record<string, unknown>
    if (existing) {
      const { data, error } = await admin
        .from('delivery_partners')
        .update(rosterPayload)
        .eq('id', existing.id as string)
        .select('*')
        .single()
      if (error) {
        if (error.code === '23505') {
          return errorResponse('A partner with this phone already exists.')
        }
        return errorResponse(error.message, 500)
      }
      partnerRow = data as Record<string, unknown>
    } else {
      const { data, error } = await admin
        .from('delivery_partners')
        .insert(rosterPayload)
        .select('*')
        .single()
      if (error) {
        if (error.code === '23505') {
          return errorResponse('A partner with this phone already exists.')
        }
        return errorResponse(error.message, 500)
      }
      partnerRow = data as Record<string, unknown>
    }

    let loginUserId = (partnerRow.user_id as string | null) ?? null

    if (email) {
      const existingAuth = await findUserByEmail(admin, email)

      if (existingAuth) {
        const { data: existingProfile } = await admin
          .from('profiles')
          .select('id, role, phone')
          .eq('id', existingAuth.id)
          .maybeSingle()

        if (
          existingProfile &&
          existingProfile.role !== 'delivery' &&
          existingProfile.id !== loginUserId
        ) {
          return errorResponse(
            'That email belongs to a non-delivery account. Use a different email.',
          )
        }

        loginUserId = existingAuth.id
        const authUpdates: Record<string, unknown> = {
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role: 'delivery',
            phone,
          },
          app_metadata: { role: 'delivery' },
        }
        if (password.length >= 6) authUpdates.password = password

        const { error: authError } = await admin.auth.admin.updateUserById(
          existingAuth.id,
          authUpdates,
        )
        if (authError) return errorResponse(authError.message, 500)
      } else {
        if (password.length < 6) {
          return errorResponse(
            'Password (at least 6 characters) is required to create a new login.',
          )
        }

        const { data: created, error: createError } =
          await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              role: 'delivery',
              phone,
            },
            app_metadata: { role: 'delivery' },
          })

        if (createError || !created.user) {
          return errorResponse(
            createError?.message || 'Unable to create delivery login.',
            500,
          )
        }
        loginUserId = created.user.id
      }

      const { error: profileError } = await admin.from('profiles').upsert(
        {
          id: loginUserId,
          email,
          full_name: fullName,
          phone,
          role: 'delivery',
          is_active: body.isActive ?? true,
        },
        { onConflict: 'id' },
      )

      if (profileError) {
        if (
          profileError.code === '23505' ||
          profileError.message.toLowerCase().includes('phone')
        ) {
          return errorResponse(
            'This phone is already used by another account. Use a different phone for the delivery login.',
          )
        }
        return errorResponse(profileError.message, 500)
      }

      const { error: memberError } = await admin
        .from('organization_members')
        .upsert(
          {
            organization_id: organizationId,
            user_id: loginUserId,
            role: 'delivery',
            is_active: true,
          },
          { onConflict: 'organization_id,user_id' },
        )
      if (memberError) return errorResponse(memberError.message, 500)

      const { data: linked, error: linkError } = await admin
        .from('delivery_partners')
        .update({ user_id: loginUserId })
        .eq('id', partnerRow.id as string)
        .select('*')
        .single()
      if (linkError) return errorResponse(linkError.message, 500)
      partnerRow = linked as Record<string, unknown>
    } else if (loginUserId && password.length >= 6) {
      const { error: authError } = await admin.auth.admin.updateUserById(
        loginUserId,
        { password, email_confirm: true },
      )
      if (authError) return errorResponse(authError.message, 500)

      await admin
        .from('profiles')
        .update({
          full_name: fullName,
          phone,
          is_active: body.isActive ?? true,
        })
        .eq('id', loginUserId)
        .eq('role', 'delivery')
    } else if (loginUserId) {
      await admin
        .from('profiles')
        .update({
          full_name: fullName,
          phone,
          is_active: body.isActive ?? true,
        })
        .eq('id', loginUserId)
        .eq('role', 'delivery')
    }

    let login = null
    if (partnerRow.user_id) {
      const { data: profile } = await admin
        .from('profiles')
        .select('email, is_active')
        .eq('id', partnerRow.user_id as string)
        .maybeSingle()
      login = profile
        ? {
            email: (profile.email as string | null) ?? null,
            is_active:
              profile.is_active == null ? null : Boolean(profile.is_active),
          }
        : null
    }

    return jsonResponse({
      data: mapPartner(partnerRow, login),
    })
  }

  return errorResponse('Unknown action.')
})
