/**
 * Staging WhatsApp mock E2E — all scenarios from docs/WHATSAPP_MOCK_TEST.md
 * Usage: node scripts/test-whatsapp-mock-e2e.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const env = {}
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

const root = resolve(import.meta.dirname, '..')
const fileEnv = loadEnvFile(resolve(root, '.env.local'))
const url = fileEnv.VITE_SUPABASE_URL
const anon = fileEnv.VITE_SUPABASE_ANON_KEY
const service = fileEnv.SUPABASE_SERVICE_ROLE_KEY
const ORG = 'a0000000-0000-4000-8000-000000000001'

if (!url || !anon || !service) {
  console.error('Missing staging keys in .env.local')
  process.exit(1)
}

const results = []
function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ''}`)
}

async function invoke(fn, body, accessToken) {
  const res = await fetch(`${url}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json }
}

const adminAuth = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const svc = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
})

console.log('\n=== WhatsApp mock E2E (staging) ===\n')

// 0) Preconditions
{
  const { data: tables } = await svc
    .from('organization_whatsapp_configs')
    .select('organization_id')
    .limit(1)
  record(
    '0a Schema: organization_whatsapp_configs reachable',
    !tables?.error && tables !== null,
    tables?.error?.message ?? 'ok',
  )

  const { data: feats, error: featErr } = await svc
    .from('organization_entitlements')
    .select('feature_key, enabled')
    .eq('organization_id', ORG)
    .in('feature_key', ['whatsapp_notifications', 'whatsapp_ordering'])
  const keys = new Set((feats ?? []).filter((f) => f.enabled).map((f) => f.feature_key))
  record(
    '0b Entitlements: whatsapp_notifications + whatsapp_ordering',
    !featErr && keys.has('whatsapp_notifications') && keys.has('whatsapp_ordering'),
    featErr?.message ?? [...keys].join(','),
  )
}

// 1) Admin login
let accessToken = ''
{
  const { data, error } = await adminAuth.auth.signInWithPassword({
    email: 'admin@staging.local',
    password: 'Test@123',
  })
  accessToken = data.session?.access_token ?? ''
  record('1 Admin login', Boolean(accessToken) && !error, error?.message ?? 'session ok')
  if (!accessToken) {
    console.log('\nAborting — no admin session.')
    process.exit(1)
  }
}

// 2) Connect mock credentials
{
  const { status, json } = await invoke(
    'whatsapp-connect',
    {
      organizationId: ORG,
      provider: 'meta_cloud',
      wabaId: 'mock_waba',
      phoneNumberId: 'mock_phone',
      displayPhoneNumber: '+91 9000000000',
      accessToken: 'mock',
    },
    accessToken,
  )
  const cfg = json?.config
  const ok =
    status === 200 &&
    cfg?.connection_status === 'connected' &&
    cfg?.token_configured === true
  record(
    '2 Connect mock WhatsApp',
    ok,
    ok
      ? `status=${cfg.connection_status}`
      : `HTTP ${status} ${JSON.stringify(json).slice(0, 200)}`,
  )
}

// 3) Send test (mock dispatch)
{
  const { status, json } = await invoke(
    'whatsapp-dispatch',
    { mode: 'test', organizationId: ORG, recipientPhone: '9876543210' },
    accessToken,
  )
  const outboxId = json?.outboxId
  let providerId = null
  if (outboxId) {
    const { data } = await svc
      .from('whatsapp_message_outbox')
      .select('status, provider_message_id, last_error')
      .eq('id', outboxId)
      .maybeSingle()
    providerId = data?.provider_message_id
    record(
      '3 Send test message (mock)',
      status === 200 &&
        Boolean(outboxId) &&
        typeof providerId === 'string' &&
        providerId.startsWith('mock_wa'),
      `outbox=${outboxId} provider=${providerId} rowStatus=${data?.status} err=${data?.last_error ?? ''}`,
    )
  } else {
    record('3 Send test message (mock)', false, `HTTP ${status} ${JSON.stringify(json).slice(0, 240)}`)
  }
}

// 4) Conversation sim: hi → menu → category → dish
{
  // Ensure at least one category + dish for menu browse
  let categoryId = null
  let dishId = null
  const { data: cats } = await svc
    .from('categories')
    .select('id, name')
    .eq('organization_id', ORG)
    .eq('is_active', true)
    .limit(1)
  if (cats?.[0]) {
    categoryId = cats[0].id
  } else {
    const { data: cat, error } = await svc
      .from('categories')
      .insert({
        organization_id: ORG,
        name: 'Mock Test Category',
        slug: `mock-test-category-${Date.now()}`,
        is_active: true,
        display_order: 1,
      })
      .select('id')
      .single()
    if (error) {
      record('4a Seed category for sim', false, error.message)
    } else {
      categoryId = cat.id
      record('4a Seed category for sim', true, categoryId)
    }
  }

  const { data: dishes } = await svc
    .from('dishes')
    .select('id, name')
    .eq('organization_id', ORG)
    .limit(1)
  if (dishes?.[0]) {
    dishId = dishes[0].id
    record('4b Use existing dish for sim', true, `${dishes[0].name} (${dishId})`)
  } else if (categoryId) {
    const { data: dish, error } = await svc
      .from('dishes')
      .insert({
        organization_id: ORG,
        category_id: categoryId,
        name: 'Mock Test Dish',
        slug: `mock-test-dish-${Date.now()}`,
        description: 'E2E mock dish',
        price: 199,
        is_veg: true,
        is_available: true,
      })
      .select('id')
      .single()
    if (error) {
      record('4b Seed dish for sim', false, error.message)
    } else {
      dishId = dish.id
      record('4b Seed dish for sim', true, dishId)
    }
  }

  if (!categoryId || !dishId) {
    record('4pre Menu data for sim', false, `categoryId=${categoryId} dishId=${dishId}`)
  } else {
    record('4pre Menu data for sim', true, `cat=${categoryId} dish=${dishId}`)
  }

  const from = '+919876543210'

  const hi = await invoke(
    'whatsapp-conversation-sim',
    { organizationId: ORG, from, text: 'hi' },
    accessToken,
  )
  const hiOk =
    hi.status === 200 &&
    hi.json?.ok === true &&
    (hi.json?.send?.raw?.mock === true || hi.json?.send?.mock === true || JSON.stringify(hi.json).includes('mock'))
  record(
    '4c Sim: hi → welcome',
    hiOk && (hi.json?.session?.current_state === 'WELCOME' || Boolean(hi.json?.session)),
    `state=${hi.json?.session?.current_state} mock=${hi.json?.send?.raw?.mock}`,
  )

  const menu = await invoke(
    'whatsapp-conversation-sim',
    { organizationId: ORG, from, interactiveId: 'act:view_menu' },
    accessToken,
  )
  record(
    '4d Sim: view menu → categories',
    menu.status === 200 &&
      menu.json?.ok === true &&
      menu.json?.session?.current_state === 'BROWSING_CATEGORIES',
    `state=${menu.json?.session?.current_state}`,
  )

  const catStep = await invoke(
    'whatsapp-conversation-sim',
    { organizationId: ORG, from, interactiveId: `cat:${categoryId}` },
    accessToken,
  )
  record(
    '4e Sim: pick category → dishes',
    catStep.status === 200 &&
      catStep.json?.ok === true &&
      catStep.json?.session?.current_state === 'VIEWING_CATEGORY',
    `state=${catStep.json?.session?.current_state}`,
  )

  const dishStep = await invoke(
    'whatsapp-conversation-sim',
    { organizationId: ORG, from, interactiveId: `dish:${dishId}` },
    accessToken,
  )
  record(
    '4f Sim: pick dish → detail',
    dishStep.status === 200 &&
      dishStep.json?.ok === true &&
      dishStep.json?.session?.current_state === 'VIEWING_ITEM',
    `state=${dishStep.json?.session?.current_state}`,
  )
}

// 5) Order status → outbox mock dispatch
{
  // Minimal order row for notification path
  const { data: profile } = await svc
    .from('profiles')
    .select('id')
    .eq('email', 'admin@staging.local')
    .maybeSingle()

  const userId = profile?.id
  const { data: branch } = await svc
    .from('branches')
    .select('id')
    .eq('organization_id', ORG)
    .limit(1)
    .maybeSingle()

  const orderNumber = `MOCK-${Date.now()}`
  const { data: order, error: orderErr } = await svc
    .from('orders')
    .insert({
      organization_id: ORG,
      user_id: userId,
      branch_id: branch?.id ?? null,
      order_number: orderNumber,
      order_status: 'pending',
      payment_method: 'cod',
      payment_status: 'pending',
      subtotal: 199,
      delivery_charge: 0,
      discount: 0,
      tax: 0,
      total: 199,
      delivery_provider: 'own',
      fulfillment_type: 'delivery',
      order_source: 'app',
      guest_name: 'Mock Customer',
      guest_phone: '9876543210',
      guest_address_line1: 'Staging Test Address',
      guest_city: 'Hyderabad',
      guest_pincode: '500001',
      whatsapp_updates_opt_in: true,
    })
    .select('id, order_status')
    .single()

  if (orderErr || !order) {
    record('5a Create opted-in order', false, orderErr?.message ?? 'no order')
  } else {
    record('5a Create opted-in order', true, order.id)

    const { data: enq, error: enqErr } = await svc.rpc(
      'prepare_and_enqueue_communication',
      {
        p_organization_id: ORG,
        p_notification_id: null,
        p_order_id: order.id,
        p_user_id: userId,
        p_order_status: 'confirmed',
        p_channel: 'whatsapp',
        p_recipient_phone: '9876543210',
        p_template_params: ['confirmed', orderNumber],
        p_opted_in: true,
      },
    )

    if (enqErr) {
      const { data: enq2, error: enqErr2 } = await svc.rpc(
        'prepare_and_enqueue_whatsapp_order_status',
        {
          p_organization_id: ORG,
          p_notification_id: null,
          p_order_id: order.id,
          p_user_id: userId,
          p_order_status: 'confirmed',
          p_recipient_phone: '9876543210',
          p_template_params: ['confirmed', orderNumber],
          p_opted_in: true,
        },
      )
      if (enqErr2) {
        record(
          '5b Enqueue order-status WhatsApp',
          false,
          `${enqErr.message} | fallback: ${enqErr2.message}`,
        )
      } else {
        record(
          '5b Enqueue order-status WhatsApp',
          true,
          JSON.stringify(enq2).slice(0, 160),
        )
      }
    } else {
      record(
        '5b Enqueue order-status WhatsApp',
        true,
        JSON.stringify(enq).slice(0, 160),
      )
    }

    // Dispatch pending outbox for this order
    const { data: pending } = await svc
      .from('whatsapp_message_outbox')
      .select('id, status')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const pendingId = pending?.[0]?.id
    if (!pendingId) {
      record('5c Dispatch mock outbox', false, 'no outbox row for order')
    } else {
      const { status, json } = await invoke(
        'communication-dispatch',
        { outboxId: pendingId },
        accessToken,
      )
      // Fallback to whatsapp-dispatch
      let final = { status, json }
      if (status >= 400) {
        final = await invoke('whatsapp-dispatch', { outboxId: pendingId }, accessToken)
      }

      const { data: row } = await svc
        .from('whatsapp_message_outbox')
        .select('status, provider_message_id, last_error')
        .eq('id', pendingId)
        .maybeSingle()

      const ok =
        row &&
        (row.status === 'sent' || row.status === 'delivered') &&
        typeof row.provider_message_id === 'string' &&
        row.provider_message_id.startsWith('mock_wa')
      record(
        '5c Dispatch mock outbox',
        Boolean(ok),
        `id=${pendingId} status=${row?.status} provider=${row?.provider_message_id} err=${row?.last_error ?? ''} http=${final.status}`,
      )
    }

    const { error: updErr } = await svc
      .from('orders')
      .update({ order_status: 'confirmed' })
      .eq('id', order.id)
    record(
      '5d Order status updated to confirmed',
      !updErr,
      updErr?.message ?? order.id,
    )
  }
}

// Summary
const failed = results.filter((r) => !r.ok)
console.log('\n=== Summary ===')
console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`)
if (failed.length) {
  console.log('Failed:')
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
console.log('All scenarios passed.')
