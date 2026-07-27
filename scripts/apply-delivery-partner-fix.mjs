/**
 * Applies the delivery-partner fulfillment SQL migration using a Postgres
 * connection string.
 *
 * Usage:
 *   set DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-....pooler.supabase.com:6543/postgres
 *   node scripts/apply-delivery-partner-fix.mjs
 *
 * Or put DATABASE_URL / SUPABASE_DB_URL in .env.local
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local')
  if (!fs.existsSync(envPath)) return {}
  return Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const i = line.indexOf('=')
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
      }),
  )
}

const env = { ...loadEnvLocal(), ...process.env }
const dbUrl =
  env.DATABASE_URL ||
  env.SUPABASE_DB_URL ||
  env.POSTGRES_URL ||
  env.SUPABASE_DATABASE_URL

if (!dbUrl) {
  console.error(
    'Missing DATABASE_URL (or SUPABASE_DB_URL). Add the Supabase Postgres connection string to .env.local, then re-run.',
  )
  process.exit(1)
}

const sqlFile = path.join(
  root,
  'supabase/migrations/20260727010000_delivery_partner_fulfillment_fixes.sql',
)
const migrationSql = fs.readFileSync(sqlFile, 'utf8')

const sql = postgres(dbUrl, { max: 1, ssl: 'require' })

try {
  await sql.unsafe(migrationSql)
  console.log('Applied 20260727010000_delivery_partner_fulfillment_fixes.sql')
} catch (error) {
  console.error('Migration failed:', error.message)
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}
