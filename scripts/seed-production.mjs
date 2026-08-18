/**
 * Run a seed script against the production Supabase project (qixpsqlifwsztncjevgl).
 *
 * Uses Supabase CLI credentials (must be logged in: npx supabase login).
 * Does not print service role keys.
 *
 * Usage:
 *   node scripts/seed-production.mjs seed-spice-malabar.mjs
 *   npm run seed:spice-malabar:production
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PRODUCTION_REF = 'qixpsqlifwsztncjevgl'
const PRODUCTION_URL = `https://${PRODUCTION_REF}.supabase.co`

const seedScript = process.argv[2] || 'seed-spice-malabar.mjs'
const seedPath = resolve(dirname(fileURLToPath(import.meta.url)), seedScript)

function readServiceRoleKey() {
  const fromEnv = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (fromEnv) return fromEnv

  const result = spawnSync(
    'npx',
    ['supabase', 'projects', 'api-keys', '--project-ref', PRODUCTION_REF, '-o', 'json'],
    { encoding: 'utf8', shell: true },
  )

  if (result.status !== 0) {
    console.error(
      result.stderr?.trim() ||
        'Could not read production API keys. Run: npx supabase login',
    )
    process.exit(1)
  }

  let rows
  try {
    rows = JSON.parse(result.stdout)
  } catch {
    console.error('Unexpected Supabase CLI output when reading API keys.')
    process.exit(1)
  }

  const service = rows.find((row) => row.name === 'service_role')?.api_key
  if (!service) {
    console.error('Production service_role key not found.')
    process.exit(1)
  }

  return service
}

const serviceKey = readServiceRoleKey()

console.log(`Seeding production (${PRODUCTION_REF}) via ${seedScript}…`)

const run = spawnSync('node', [seedPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_SUPABASE_URL: PRODUCTION_URL,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  },
})

process.exit(run.status ?? 1)
