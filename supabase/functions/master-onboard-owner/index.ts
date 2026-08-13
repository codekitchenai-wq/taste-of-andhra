// Master-only: create or attach a restaurant owner Auth user.
//
// Deploy: supabase functions deploy master-onboard-owner
//
// Body: { organizationId, ownerEmail, ownerName, ownerPhone? }

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'

const MASTER_EMAIL = 'master@tasteofandhra.test'

function randomPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  let value = 'Toa-'
  for (const byte of bytes) {
    value += alphabet[byte % alphabet.length]
  }
  return value
}

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
) {
  for (let page = 1; page <= 10; page += 1) {
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

  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Server is missing Supabase credentials.', 500)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return errorResponse('Please sign in.', 401)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: profile } = await admin
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle()

  const isMaster =
    profile?.role === 'platform_master' ||
    user.email?.toLowerCase() === MASTER_EMAIL ||
    profile?.email?.toLowerCase() === MASTER_EMAIL

  if (!isMaster) {
    return errorResponse('Only the platform master can invite restaurant owners.', 403)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body.')
  }

  const organizationId = String(body.organizationId ?? '').trim()
  const ownerEmail = String(body.ownerEmail ?? '').trim().toLowerCase()
  const ownerName = String(body.ownerName ?? '').trim()
  const ownerPhone = String(body.ownerPhone ?? '').trim()

  if (!organizationId || !ownerEmail || !ownerName) {
    return errorResponse('organizationId, ownerEmail, and ownerName are required.')
  }

  const { data: org } = await admin
    .from('organizations')
    .select('id, name')
    .eq('id', organizationId)
    .maybeSingle()

  if (!org) {
    return errorResponse('Organization not found.', 404)
  }

  const existing = await findUserByEmail(admin, ownerEmail)
  let userId = existing?.id ?? null
  let temporaryPassword: string | null = null
  let existingUser = Boolean(existing)

  if (!existing) {
    temporaryPassword = randomPassword()
    const created = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        role: 'admin',
        phone: ownerPhone || null,
      },
      app_metadata: { role: 'admin' },
    })
    if (created.error || !created.data.user) {
      return errorResponse(
        created.error?.message || 'Unable to create owner login.',
        400,
      )
    }
    userId = created.data.user.id
  }

  if (!userId) {
    return errorResponse('Unable to resolve owner user.', 500)
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      full_name: ownerName,
      email: ownerEmail,
      phone: ownerPhone || null,
      role: 'admin',
      is_active: true,
    },
    { onConflict: 'id' },
  )

  if (profileError) {
    return errorResponse(profileError.message, 400)
  }

  const { error: memberError } = await admin.from('organization_members').upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      role: 'restaurant_owner',
      is_active: true,
    },
    { onConflict: 'organization_id,user_id' },
  )

  if (memberError) {
    return errorResponse(memberError.message, 400)
  }

  return jsonResponse({
    userId,
    existingUser,
    temporaryPassword,
    organizationId,
    ownerEmail,
  })
})
