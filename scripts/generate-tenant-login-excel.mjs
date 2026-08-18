/**
 * Generates docs/TENANT_LOGIN_CREDENTIALS.xlsx
 * Usage: node scripts/generate-tenant-login-excel.mjs
 */
import ExcelJS from 'exceljs'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEMO_PASSWORD,
  KNOWN_TENANTS,
  MASTER_EMAIL,
  MASTER_NAME,
  MASTER_PRODUCTION_LOGIN,
  localLoginUrl,
  productionLoginUrl,
  tenantDemoAccounts,
} from './lib/tenant-demo-accounts.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'docs', 'TENANT_LOGIN_CREDENTIALS.xlsx')

const HEADER = [
  'Level',
  'Tenant',
  'Persona',
  'Username',
  'Password',
  'Login URL (production)',
  'Login URL (local)',
]

const rows = [
  {
    level: 'Master / control plane',
    tenant: 'DirectApp (all tenants)',
    persona: MASTER_NAME,
    username: MASTER_EMAIL,
    password: DEMO_PASSWORD,
    productionUrl: MASTER_PRODUCTION_LOGIN,
    localUrl: localLoginUrl(undefined, 'platform_master'),
  },
]

for (const tenant of KNOWN_TENANTS) {
  for (const account of tenantDemoAccounts(tenant)) {
    rows.push({
      level: 'Tenant',
      tenant: tenant.name,
      persona:
        account.role === 'admin'
          ? 'Admin'
          : account.role === 'delivery'
            ? 'Delivery partner'
            : 'Customer',
      username: account.email,
      password: DEMO_PASSWORD,
      productionUrl: productionLoginUrl(tenant.productionOrigin, account.role),
      localUrl: localLoginUrl(tenant.slug, account.role),
    })
  }
}

const workbook = new ExcelJS.Workbook()
workbook.creator = 'DirectApp'
workbook.created = new Date()

const sheet = workbook.addWorksheet('Login credentials', {
  views: [{ state: 'frozen', ySplit: 1 }],
})

sheet.columns = [
  { header: HEADER[0], width: 24 },
  { header: HEADER[1], width: 28 },
  { header: HEADER[2], width: 20 },
  { header: HEADER[3], width: 42 },
  { header: HEADER[4], width: 14 },
  { header: HEADER[5], width: 62 },
  { header: HEADER[6], width: 62 },
]

const headerRow = sheet.getRow(1)
headerRow.height = 24
headerRow.eachCell((cell) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF8B1E1E' },
  }
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  cell.alignment = { vertical: 'middle' }
})

rows.forEach((row, index) => {
  const excelRow = sheet.addRow([
    row.level,
    row.tenant,
    row.persona,
    row.username,
    row.password,
    row.productionUrl,
    row.localUrl,
  ])
  excelRow.alignment = { vertical: 'middle' }
  if (index === 0) {
    excelRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF3CD' },
      }
    })
  }
})

const notes = workbook.addWorksheet('Notes')
notes.columns = [{ width: 110 }]
const noteLines = [
  'DirectApp — tenant-scoped demo logins',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)}`,
  '',
  'Rules',
  '• Master (master@tasteofandhra.test) is platform-level only. Login: https://www.directapp.in/master/login',
  '• Restaurant users are created per tenant. demoadmin@tasteofandhra.test cannot sign in on Spice Malabar, and vice versa.',
  '• Emails use a .test domain because the login form requires a valid email (demoadmin@tasteofandhra → demoadmin@tasteofandhra.test).',
  '• Shared password for every row: Test@123',
  '• Devi Home Foods rows apply only if that restaurant exists in the environment.',
  '',
  'Seed / refresh',
  '• Staging: npm run seed:qa-testers',
  '• Production: npm run seed:qa-testers:production',
]
noteLines.forEach((line, index) => {
  const row = notes.getRow(index + 1)
  row.getCell(1).value = line
  if (index === 0) {
    row.getCell(1).font = { bold: true, size: 14 }
  }
})

mkdirSync(dirname(outPath), { recursive: true })
await workbook.xlsx.writeFile(outPath)
console.log(`Wrote ${outPath}`)
console.log(`${rows.length} credential rows`)
