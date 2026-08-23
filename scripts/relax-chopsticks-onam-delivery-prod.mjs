/**
 * Production: clear Chopsticks pincode allowlist + max distance so quotes are
 * not blocked during Onam. Frontend still shows an 8 km FYI for Onam flows.
 *
 * Run: node scripts/seed-production.mjs relax-chopsticks-onam-delivery-prod.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SLUG = 'chopsticksspicemalabar'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: org, error: orgErr } = await admin
  .from('organizations')
  .select('id, name, slug')
  .eq('slug', SLUG)
  .maybeSingle()

if (orgErr || !org) {
  console.error('Org not found', orgErr?.message)
  process.exit(1)
}

const { data: before } = await admin
  .from('delivery_settings')
  .select('id, service_pincodes, max_distance_km, branch_id')
  .eq('organization_id', org.id)

console.log('Before:', JSON.stringify(before, null, 2))

const { data: updated, error: updErr } = await admin
  .from('delivery_settings')
  .update({
    service_pincodes: [],
    max_distance_km: null,
    is_enabled: true,
    provider: 'own',
  })
  .eq('organization_id', org.id)
  .select('id, service_pincodes, max_distance_km')

if (updErr) {
  console.error('Update failed:', updErr.message)
  process.exit(1)
}

console.log(
  `Relaxed Chopsticks (${org.name}) delivery: no pincode allowlist, no max distance`,
)
console.log('After:', JSON.stringify(updated, null, 2))
