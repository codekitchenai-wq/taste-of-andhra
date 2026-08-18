/**
 * Taste of Andhra-only anon signup is retired.
 * Use: npm run seed:qa-testers
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
console.log('seed:demo-users now creates per-tenant demo logins via seed:qa-testers.\n')

const result = spawnSync(
  process.execPath,
  [resolve(root, 'scripts/seed-qa-testers.mjs')],
  { cwd: root, stdio: 'inherit', env: process.env },
)

process.exit(result.status ?? 1)
