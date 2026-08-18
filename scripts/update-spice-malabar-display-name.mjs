/**
 * Set Chopstick Spice Malabar public/admin display name in production.
 *
 *   node scripts/seed-production.mjs update-spice-malabar-display-name.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const NAME = 'Chopstick Spice Malabar'

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data, error } = await admin
  .from('organizations')
  .update({ name: NAME })
  .eq('slug', 'chopsticksspicemalabar')
  .select('id, slug, name')
  .maybeSingle()

if (error || !data) {
  console.error(error?.message || 'Organization not found')
  process.exit(1)
}

console.log(`Updated ${data.slug} display name → ${data.name}`)
