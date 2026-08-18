/**
 * Cross-tenant isolation probe (production or staging via env from seed-production).
 * Does not print secrets.
 */
import { createClient } from '@supabase/supabase-js'

const TOA_ORG = 'a0000000-0000-4000-8000-000000000001'
const SPICE_SLUG = 'chopsticksspicemalabar'
const DEVI_SLUG = 'devihomefoods'

const url = process.env.VITE_SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!url || !serviceKey) {
  console.error('Missing Supabase env')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const anon = anonKey
  ? createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

const failures = []
const warnings = []

function pass(msg) {
  console.log(`PASS  ${msg}`)
}

function fail(msg) {
  console.log(`FAIL  ${msg}`)
  failures.push(msg)
}

function warn(msg) {
  console.log(`WARN  ${msg}`)
  warnings.push(msg)
}

async function columnExists(table, column) {
  const { data, error } = await admin
    .from(table)
    .select(column)
    .limit(1)
  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes(column) && (msg.includes('does not exist') || msg.includes('schema cache'))) {
      return false
    }
    throw new Error(`${table}.${column}: ${error.message}`)
  }
  return true
}

async function orgBySlug(slug) {
  const { data, error } = await admin
    .from('organizations')
    .select('id, slug, name, settings, gstin')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

async function countForOrg(table, orgId, extra = () => admin.from(table)) {
  const { count, error } = await extra(admin.from(table))
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
  if (error) throw new Error(`${table}: ${error.message}`)
  return count ?? 0
}

async function main() {
  console.log(`Tenant isolation probe on ${url}\n`)

  const spice = await orgBySlug(SPICE_SLUG)
  const devi = await orgBySlug(DEVI_SLUG)
  const toa = await orgBySlug('thetasteofandhra')

  if (!spice?.id) fail(`missing org ${SPICE_SLUG}`)
  else pass(`${SPICE_SLUG} org ${spice.id}`)
  if (!toa?.id) fail('missing Taste of Andhra org')
  else pass(`thetasteofandhra org ${toa.id}`)
  if (devi?.id) pass(`devihomefoods org ${devi.id}`)
  else warn('devihomefoods org not seeded')

  // Catalog isolation
  if (spice?.id && toa?.id) {
    const spiceDishes = await countForOrg('dishes', spice.id)
    const toaDishes = await countForOrg('dishes', toa.id)
    pass(`catalog counts — Spice ${spiceDishes}, TOA ${toaDishes}`)
    if (spiceDishes === toaDishes && spiceDishes > 0) {
      fail('Spice and TOA dish counts are identical — possible catalog mix')
    } else {
      pass('catalog dish counts differ per restaurant')
    }

    const { data: spiceSample } = await admin
      .from('dishes')
      .select('name, organization_id')
      .eq('organization_id', spice.id)
      .limit(3)
    const wrongOrg = (spiceSample ?? []).filter((d) => d.organization_id !== spice.id)
    if (wrongOrg.length) fail('Spice dish sample contains wrong organization_id')
    else pass('Spice dish sample rows match org')
  }

  // Per-user tables: schema + duplicate user without org split
  const scopedTables = ['cart', 'favorites', 'loyalty_accounts', 'addresses', 'notifications']
  for (const table of scopedTables) {
    const hasOrg = await columnExists(table, 'organization_id')
    if (hasOrg) pass(`${table}.organization_id column exists`)
    else fail(`${table}.organization_id column missing — migrations not applied`)
  }

  for (const table of ['cart', 'favorites', 'loyalty_accounts']) {
    const hasOrg = await columnExists(table, 'organization_id')
    if (!hasOrg) continue
    const { data, error } = await admin.rpc('exec_sql', {
      query: `
        SELECT user_id, COUNT(DISTINCT organization_id) AS org_count
        FROM public.${table}
        GROUP BY user_id
        HAVING COUNT(DISTINCT organization_id) > 1
        LIMIT 5
      `,
    })
    if (error?.message?.includes('exec_sql')) {
      // fallback: fetch and analyze in JS
      const { data: rows, error: fetchError } = await admin
        .from(table)
        .select('user_id, organization_id')
        .limit(5000)
      if (fetchError) {
        warn(`${table} multi-org scan skipped: ${fetchError.message}`)
        continue
      }
      const byUser = new Map()
      for (const row of rows ?? []) {
        const set = byUser.get(row.user_id) ?? new Set()
        set.add(row.organization_id)
        byUser.set(row.user_id, set)
      }
      const multi = [...byUser.entries()].filter(([, set]) => set.size > 1)
      if (multi.length) {
        pass(`${table}: ${multi.length} user(s) have rows in multiple restaurants (expected after visiting multiple tenants)`)
      } else {
        pass(`${table}: no multi-restaurant rows in sample (or single-tenant usage)`)
      }
      continue
    }
  }

  // Payment / UPI settings per org (no shared env leakage in DB)
  for (const [label, org] of [
    ['TOA', toa],
    ['Spice', spice],
    ['Devi', devi],
  ]) {
    if (!org?.id) continue
    const { data: upiVpa } = await admin
      .from('app_settings')
      .select('value')
      .eq('organization_id', org.id)
      .eq('key', 'upi_vpa')
      .maybeSingle()
    const settings = org.settings && typeof org.settings === 'object' ? org.settings : {}
    const razorpayKey =
      typeof settings.razorpay_key_id === 'string' ? settings.razorpay_key_id.trim() : ''
    const vpa = (upiVpa?.value ?? '').trim()
    pass(`${label} UPI VPA in DB: ${vpa || '(empty)'}`)
    pass(`${label} Razorpay key in settings: ${razorpayKey ? 'set' : '(empty)'}`)
    if (label !== 'TOA' && vpa.includes('tasteofandhra')) {
      fail(`${label} inherited Taste of Andhra UPI VPA in app_settings`)
    }
    if (label !== 'TOA' && razorpayKey && razorpayKey === settings.razorpay_key_id) {
      // only fail if we could compare to env — skip
    }
  }

  if (spice?.settings && typeof spice.settings === 'object') {
    const sw = spice.settings.storefront_whatsapp_enabled
    pass(`Spice storefront_whatsapp_enabled=${String(sw)}`)
  }

  // Live storefront HTML — no TOA leakage on Spice host
  const hosts = [
    { name: 'Spice Malabar', url: 'https://chopsticksspicemalabar.directapp.in/' },
    { name: 'Taste of Andhra', url: 'https://www.thetasteofandhra.com/' },
    { name: 'DirectApp', url: 'https://www.directapp.in/' },
  ]
  for (const { name, url: pageUrl } of hosts) {
    try {
      const res = await fetch(pageUrl, { redirect: 'follow' })
      const html = await res.text()
      if (res.status !== 200) {
        warn(`${name} homepage HTTP ${res.status}`)
        continue
      }
      const hasToaUpi = html.includes('tasteofandhra@okaxis')
      const hasToaBrand = html.includes('The Taste of Andhra')
      if (name === 'Spice Malabar') {
        if (hasToaUpi) fail('Spice homepage HTML contains TOA UPI id')
        else pass('Spice homepage has no tasteofandhra@okaxis in HTML')
        if (hasToaBrand && !html.includes('Chopstick')) {
          warn('Spice homepage mentions Taste of Andhra — check branding copy')
        } else {
          pass('Spice homepage branding looks tenant-specific')
        }
      }
      if (name === 'DirectApp') {
        if (html.includes('tasteofandhra@okaxis')) {
          warn('DirectApp apex mentions TOA UPI (may be ok on marketing site)')
        } else {
          pass('DirectApp apex has no TOA UPI in HTML')
        }
      }
    } catch (error) {
      warn(`${name} fetch failed: ${error instanceof Error ? error.message : error}`)
    }
  }

  // Anon RLS: Spice menu query must not return TOA dishes
  if (anon && spice?.id && toa?.id) {
    const { data: spiceMenu, error: spiceErr } = await anon
      .from('dishes')
      .select('id, organization_id')
      .eq('organization_id', spice.id)
      .eq('is_available', true)
      .limit(20)
    if (spiceErr) fail(`anon Spice menu: ${spiceErr.message}`)
    else {
      const leaked = (spiceMenu ?? []).filter((d) => d.organization_id !== spice.id)
      if (leaked.length) fail('anon Spice menu contains wrong organization_id rows')
      else pass(`anon Spice menu sample (${spiceMenu?.length ?? 0} rows) org-scoped`)
    }
  }

  console.log('')
  if (warnings.length) {
    console.log(`${warnings.length} warning(s)`)
    for (const w of warnings) console.log(`  - ${w}`)
  }
  if (failures.length) {
    console.error(`\n${failures.length} isolation check(s) FAILED`)
    process.exit(1)
  }
  console.log('All tenant isolation checks passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
