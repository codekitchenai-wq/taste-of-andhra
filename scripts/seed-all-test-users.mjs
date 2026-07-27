/**
 * Thin wrapper: prefers full QA seed (service role). Falls back to anon signup
 * for the three demo personas only.
 *
 * Preferred: npm run seed:qa-testers
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const qa = spawnSync(process.execPath, [resolve(root, 'scripts/seed-qa-testers.mjs')], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

if (qa.status === 0) {
  process.exit(0)
}

console.warn(
  '\nseed:qa-testers failed (missing service role or enum). Falling back to anon demo signup...\n',
)

const demo = spawnSync(
  process.execPath,
  [resolve(root, 'scripts/seed-demo-users.mjs')],
  {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  },
)

process.exit(demo.status ?? 1)
