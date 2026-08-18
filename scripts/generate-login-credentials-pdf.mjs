/**
 * Generates docs/LOGIN_CREDENTIALS.pdf — tester login cheat sheet.
 * Usage: node scripts/generate-login-credentials-pdf.mjs
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEMO_PASSWORD,
  KNOWN_TENANTS,
  MASTER_EMAIL,
  localLoginUrl,
  productionLoginUrl,
  tenantDemoAccounts,
} from './lib/tenant-demo-accounts.mjs'

const require = createRequire(import.meta.url)
const PDFDocument = require('pdfkit')

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'docs', 'LOGIN_CREDENTIALS.pdf')

const PASSWORD = DEMO_PASSWORD
const LOCAL = 'http://127.0.0.1:5173'
const PROD = 'https://www.directapp.in'

const accounts = [
  ['DirectApp Master', MASTER_EMAIL, '/master/login', '/master', 'https://www.directapp.in/master/login'],
  ...KNOWN_TENANTS.flatMap((tenant) =>
    tenantDemoAccounts(tenant).map((account) => [
      `${tenant.name} ${account.role}`,
      account.email,
      localLoginUrl(tenant.slug, account.role).replace(LOCAL, ''),
      '/',
      productionLoginUrl(tenant.productionOrigin, account.role),
    ]),
  ),
]

mkdirSync(dirname(outPath), { recursive: true })

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 48, bottom: 48, left: 42, right: 42 },
  info: {
    Title: 'Taste of Andhra — Login Credentials',
    Author: 'Taste of Andhra',
    Subject: 'QA tester login reference',
  },
})

const chunks = []
doc.on('data', (c) => chunks.push(c))
const done = new Promise((resolve) => doc.on('end', resolve))

function heading(text, size = 18) {
  doc.font('Helvetica-Bold').fontSize(size).fillColor('#1a1a1a').text(text)
  doc.moveDown(0.35)
}

function body(text, opts = {}) {
  doc.font('Helvetica').fontSize(10).fillColor('#333333').text(text, opts)
}

function muted(text) {
  doc.font('Helvetica').fontSize(9).fillColor('#666666').text(text)
}

heading('Taste of Andhra — Login Credentials & Links', 16)
muted(`Generated ${new Date().toISOString().slice(0, 10)} · For QA / testing only`)
doc.moveDown(0.6)

doc
  .roundedRect(doc.x, doc.y, doc.page.width - 84, 36, 4)
  .fill('#f3f0e8')
doc.fillColor('#8b1e1e').font('Helvetica-Bold').fontSize(12)
doc.text(`Shared password for all accounts:  ${PASSWORD}`, 54, doc.y + 12, {
  width: doc.page.width - 108,
})
doc.moveDown(1.4)
doc.y += 8

body(`Local base:  ${LOCAL}`)
body(`Production:  ${PROD}`)
doc.moveDown(0.8)

heading('All accounts', 13)
doc.moveDown(0.2)

const col = {
  n: 42,
  persona: 58,
  email: 158,
  password: 340,
  login: 400,
}
const rowH = 28
const tableTop = doc.y

function drawHeader() {
  doc.rect(42, tableTop, doc.page.width - 84, 18).fill('#2c2c2c')
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8)
  doc.text('#', col.n, tableTop + 5, { width: 14 })
  doc.text('Persona', col.persona, tableTop + 5, { width: 95 })
  doc.text('Email', col.email, tableTop + 5, { width: 175 })
  doc.text('Password', col.password, tableTop + 5, { width: 55 })
  doc.text('Login URL (local)', col.login, tableTop + 5, { width: 150 })
}

drawHeader()
let y = tableTop + 18

accounts.forEach((row, i) => {
  const [persona, email, loginPath, , productionUrl] = row
  const bg = i % 2 === 0 ? '#fafafa' : '#ffffff'
  const localUrl = loginPath.startsWith('http') ? loginPath : `${LOCAL}${loginPath}`
  const prodUrl = productionUrl || `${PROD}${loginPath}`
  doc.rect(42, y, doc.page.width - 84, rowH).fill(bg)
  doc.fillColor('#222222').font('Helvetica').fontSize(8)
  doc.text(String(i + 1), col.n, y + 5, { width: 14 })
  doc.font('Helvetica-Bold').text(persona, col.persona, y + 5, { width: 95 })
  doc.font('Helvetica').text(email, col.email, y + 5, { width: 175 })
  doc.font('Helvetica-Bold').fillColor('#8b1e1e').text(PASSWORD, col.password, y + 5, {
    width: 55,
  })
  doc
    .font('Helvetica')
    .fillColor('#1a5fb4')
    .fontSize(7)
    .text(localUrl, col.login, y + 4, { width: 150, link: localUrl })
  doc
    .fillColor('#555555')
    .fontSize(6.5)
    .text(prodUrl, col.login, y + 15, { width: 150, link: prodUrl })
  y += rowH
})

doc.y = y + 12
heading('After login', 13)
const landings = [
  ['DirectApp Master', '/master'],
  ['DirectApp Master · Tenants', '/master/tenants'],
  ['DirectApp Master · Features', '/master/features'],
  ['Customer home', '/'],
  ['Customer menu', '/menu'],
  ['Admin', '/admin'],
  ['Delivery', '/delivery'],
]
landings.forEach(([label, path]) => {
  body(`${label}:  ${LOCAL}${path}   |   ${PROD}${path}`)
})

doc.moveDown(0.8)
heading('Notes', 13)
body('• Use the matching login URL for each persona (do not use /login for admin or delivery).')
body('• Log out or use a private window before switching persona.')
body('• Seed accounts: npm run seed:qa-testers')
body('• Excel: docs/TENANT_LOGIN_CREDENTIALS.xlsx')
body('• Source: docs/LOGIN_CREDENTIALS.md')

doc.end()
await done
writeFileSync(outPath, Buffer.concat(chunks))
console.log(`Wrote ${outPath}`)
