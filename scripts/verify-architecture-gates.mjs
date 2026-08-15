/**
 * Structural + remote isolation probe for P0 architecture gates.
 *
 * Usage (linked production or staging):
 *   node scripts/verify-architecture-gates.mjs
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env, or
 * `npx supabase status` local, or linked project access via CLI db execute.
 */

import { createClient } from '@supabase/supabase-js'

const TASTE_ORG = 'a0000000-0000-4000-8000-000000000001'
const PROBE_ORG = 'a0000000-0000-4000-8000-000000000099'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    'Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY',
  )
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function main() {
  console.log('Architecture gates verification…')

  const { data: checks, error: checkError } = await admin.rpc(
    'assert_org_admin_isolation',
    { p_org_a: TASTE_ORG, p_org_b: PROBE_ORG },
  )

  if (checkError) {
    throw new Error(`assert_org_admin_isolation failed: ${checkError.message}`)
  }

  for (const row of checks ?? []) {
    assert(row.passed, `FAIL ${row.check_name}: ${row.detail}`)
    console.log(`  OK ${row.check_name}`)
  }

  const { data: paymentConfig, error: cfgError } = await admin
    .from('organization_payment_configs')
    .select('organization_id, mode, status')
    .eq('organization_id', TASTE_ORG)
    .maybeSingle()

  assert(!cfgError, cfgError?.message ?? 'payment config query failed')
  assert(paymentConfig, 'Taste of Andhra payment config missing')
  assert(paymentConfig.mode === 'DIRECT', 'default mode must be DIRECT')
  console.log('  OK payment config DIRECT seed')

  // Ensure a second org can exist without colliding on slug (create+delete probe).
  await admin.from('organizations').delete().eq('id', PROBE_ORG)
  const { error: insertOrgError } = await admin.from('organizations').insert({
    id: PROBE_ORG,
    name: 'Architecture Probe Org',
    slug: `arch-probe-${Date.now().toString(36)}`,
    status: 'trialing',
  })
  assert(!insertOrgError, insertOrgError?.message ?? 'probe org insert failed')

  const { data: probeOrders, error: probeOrdersError } = await admin
    .from('orders')
    .select('id')
    .eq('organization_id', PROBE_ORG)
    .limit(1)

  assert(!probeOrdersError, probeOrdersError?.message ?? 'probe orders failed')
  assert(Array.isArray(probeOrders), 'orders query should return array')

  await admin.from('organizations').delete().eq('id', PROBE_ORG)
  console.log('  OK second-org create/delete probe')

  console.log('All architecture gate checks passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
