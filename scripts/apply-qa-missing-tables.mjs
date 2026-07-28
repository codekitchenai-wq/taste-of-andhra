/**
 * Applies QA catch-up SQL that creates missing delivery_partners + qr_tables.
 *
 * Usage:
 *   set DATABASE_URL=postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres
 *   node scripts/apply-qa-missing-tables.mjs
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

const files = [
  'supabase/migrations/20260728120000_qa_missing_delivery_partners_qr_tables.sql',
  'supabase/migrations/20260727010000_delivery_partner_fulfillment_fixes.sql',
]

const sql = postgres(dbUrl, { max: 1, ssl: 'require' })

try {
  for (const relative of files) {
    const full = path.join(root, relative)
    const migrationSql = fs.readFileSync(full, 'utf8')
    await sql.unsafe(migrationSql)
    console.log('Applied', path.basename(full))
  }
} catch (error) {
  console.error('Migration failed:', error.message)
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}
