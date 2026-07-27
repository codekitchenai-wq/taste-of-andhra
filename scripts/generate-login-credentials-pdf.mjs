/**
 * Generates docs/LOGIN_CREDENTIALS.pdf — tester login cheat sheet.
 * Usage: node scripts/generate-login-credentials-pdf.mjs
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const PDFDocument = require('pdfkit')

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'docs', 'LOGIN_CREDENTIALS.pdf')

const PASSWORD = 'Test@123'
const LOCAL = 'http://127.0.0.1:5173'
const PROD = 'https://www.thetasteofandhra.com'

const accounts = [
  ['Superuser (Master)', 'master@tasteofandhra.test', '/master/login', '/master'],
  ['Demo Customer', 'customer@tasteofandhra.test', '/login', '/'],
  ['Demo Admin', 'admin@tasteofandhra.test', '/admin/login', '/admin'],
  ['Demo Delivery', 'delivery@tasteofandhra.test', '/delivery/login', '/delivery'],
  ['Tester 1 Customer', 'tester1.customer@thetasteofandhra.com', '/login', '/'],
  ['Tester 1 Admin', 'tester1.admin@thetasteofandhra.com', '/admin/login', '/admin'],
  ['Tester 1 Delivery', 'tester1.delivery@thetasteofandhra.com', '/delivery/login', '/delivery'],
  ['Tester 2 Customer', 'tester2.customer@thetasteofandhra.com', '/login', '/'],
  ['Tester 2 Admin', 'tester2.admin@thetasteofandhra.com', '/admin/login', '/admin'],
  ['Tester 2 Delivery', 'tester2.delivery@thetasteofandhra.com', '/delivery/login', '/delivery'],
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
  const [persona, email, loginPath] = row
  const bg = i % 2 === 0 ? '#fafafa' : '#ffffff'
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
    .text(`${LOCAL}${loginPath}`, col.login, y + 4, { width: 150, link: `${LOCAL}${loginPath}` })
  doc
    .fillColor('#555555')
    .fontSize(6.5)
    .text(`${PROD}${loginPath}`, col.login, y + 15, { width: 150, link: `${PROD}${loginPath}` })
  y += rowH
})

doc.y = y + 12
heading('After login', 13)
const landings = [
  ['Superuser', '/master'],
  ['Superuser · Tenants', '/master/tenants'],
  ['Superuser · Features', '/master/features'],
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
body('• Seed accounts: npm run seed:all-test-users')
body('• Source: docs/LOGIN_CREDENTIALS.md')

doc.end()
await done
writeFileSync(outPath, Buffer.concat(chunks))
console.log(`Wrote ${outPath}`)
