/**
 * Builds a consolidated multi-persona QA Excel report.
 * Sources:
 *  - docs/CUSTOMER_PERSONA_TEST_RESULTS.xlsx
 *  - docs/ADMIN_QA_RESULTS_2026-07-27.json
 *  - Delivery_Partner_Test_Report.xlsx
 *
 * Output: docs/PERSONA_QA_RESULTS_ALL_2026-07-27.xlsx
 * Usage: node scripts/generate-all-personas-qa-excel.mjs
 */
import ExcelJS from 'exceljs'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outPath = path.join(root, 'docs', 'PERSONA_QA_RESULTS_ALL_2026-07-27.xlsx')

const COLORS = {
  header: 'FFC62828',
  white: 'FFFFFFFF',
  Pass: 'FFE8F5E9',
  PASS: 'FFE8F5E9',
  Fail: 'FFFFEBEE',
  FAIL: 'FFFFEBEE',
  Blocked: 'FFFFF8E1',
  'N/A (By Design)': 'FFE3F2FD',
  'N/A': 'FFE3F2FD',
}

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.header },
    }
    cell.font = { bold: true, color: { argb: COLORS.white }, size: 11 }
    cell.alignment = { vertical: 'middle', wrapText: true }
  })
  row.height = 26
}

function statusFill(status) {
  return COLORS[status] || 'FFFFFFFF'
}

async function readCustomerCases() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(
    path.join(root, 'docs', 'CUSTOMER_PERSONA_TEST_RESULTS.xlsx'),
  )
  const sheet = wb.getWorksheet('Test Results')
  const cases = []
  sheet.eachRow((row, n) => {
    if (n === 1) return
    cases.push({
      persona: 'Customer',
      id: String(row.getCell(1).value ?? ''),
      area: String(row.getCell(2).value ?? ''),
      functionality: String(row.getCell(3).value ?? ''),
      steps: String(row.getCell(4).value ?? ''),
      expected: String(row.getCell(5).value ?? ''),
      status: String(row.getCell(6).value ?? ''),
      evidence: String(row.getCell(7).value ?? ''),
    })
  })
  return cases
}

function readAdminCases() {
  // Prefer JSON snapshot when present; otherwise read the Admin Excel.
  const jsonPath = path.join(root, 'docs', 'ADMIN_QA_RESULTS_2026-07-27.json')
  try {
    const raw = JSON.parse(readFileSync(jsonPath, 'utf8'))
    return raw.cases.map((c) => ({
      persona: 'Admin',
      id: c.id,
      area: c.area,
      functionality: c.functionality,
      steps: c.steps,
      expected: c.expected,
      status: c.status,
      evidence: c.notes,
    }))
  } catch {
    return null
  }
}

async function readAdminCasesFromExcel() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(
    path.join(root, 'docs', 'ADMIN_PERSONA_QA_RESULTS_2026-07-27.xlsx'),
  )
  const sheet =
    wb.getWorksheet('Functionalities Tested') ||
    wb.getWorksheet('Test Results') ||
    wb.getWorksheet('Results') ||
    wb.worksheets.find((s) => /functionality|result|tested/i.test(s.name)) ||
    wb.worksheets[1] ||
    wb.worksheets[0]

  const header = []
  sheet.getRow(1).eachCell((cell, col) => {
    header[col] = String(cell.value ?? '')
      .toLowerCase()
      .trim()
  })

  const idx = (names, fallback) => {
    const found = header.findIndex(
      (h) => h && names.some((n) => h.includes(n)),
    )
    return found > 0 ? found : fallback
  }

  const idCol = idx(['id'], 1)
  const areaCol = idx(['area'], 2)
  const fnCol = idx(['functionality', 'feature', 'test case'], 3)
  const stepsCol = idx(['steps'], 4)
  const expectedCol = idx(['expected'], 5)
  const statusCol = idx(['status', 'result'], 6)
  const notesCol = idx(['evidence', 'notes', 'reason', 'observation'], 7)

  const cases = []
  sheet.eachRow((row, n) => {
    if (n === 1) return
    const id = String(row.getCell(idCol).value ?? '').trim()
    if (!id) return
    cases.push({
      persona: 'Admin',
      id,
      area: String(row.getCell(areaCol).value ?? ''),
      functionality: String(row.getCell(fnCol).value ?? ''),
      steps: String(row.getCell(stepsCol).value ?? ''),
      expected: String(row.getCell(expectedCol).value ?? ''),
      status: String(row.getCell(statusCol).value ?? ''),
      evidence: String(row.getCell(notesCol).value ?? ''),
    })
  })
  return cases
}

async function readDeliveryCases() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(path.join(root, 'Delivery_Partner_Test_Report.xlsx'))
  const sheet = wb.getWorksheet('Test Results')
  const cases = []
  sheet.eachRow((row, n) => {
    if (n === 1) return
    cases.push({
      persona: 'Delivery',
      id: String(row.getCell(1).value ?? ''),
      area: String(row.getCell(2).value ?? ''),
      functionality: String(row.getCell(3).value ?? ''),
      steps: String(row.getCell(4).value ?? ''),
      expected: '',
      status: String(row.getCell(5).value ?? ''),
      evidence: [
        row.getCell(7).value,
        row.getCell(8).value,
      ]
        .filter(Boolean)
        .map(String)
        .join(' | '),
    })
  })
  return cases
}

function countByStatus(cases) {
  return cases.reduce((acc, c) => {
    const key = c.status || 'Unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

const customer = await readCustomerCases()
const admin = readAdminCases() ?? (await readAdminCasesFromExcel())
const delivery = await readDeliveryCases()
const all = [...customer, ...admin, ...delivery]

const wb = new ExcelJS.Workbook()
wb.creator = 'Persona QA'
wb.created = new Date()

// ---- Summary ----
const summary = wb.addWorksheet('Summary')
summary.columns = [
  { header: 'Item', width: 42 },
  { header: 'Value', width: 90 },
]
summary.addRow(['Taste of Andhra — All Personas QA Report', ''])
summary.getRow(1).font = {
  bold: true,
  size: 14,
  color: { argb: COLORS.header },
}
;[
  ['Test date', '2026-07-27'],
  ['Environment', 'Local Vite http://127.0.0.1:5173'],
  ['Personas covered', 'Customer, Admin, Delivery Partner'],
  ['Total functionalities tested', all.length],
  [
    'Customer account',
    'customer@tasteofandhra.test (41 cases: 31 Pass / 5 Fail / 5 Blocked)',
  ],
  [
    'Admin account',
    'admin@tasteofandhra.test (33 cases: 22 Pass / 8 Fail / 3 Blocked)',
  ],
  [
    'Delivery account',
    'delivery@tasteofandhra.test (19 cases: 12 Pass / 6 Fail / 1 N/A)',
  ],
  [
    'Overall Pass',
    String(all.filter((c) => /^pass$/i.test(c.status)).length),
  ],
  [
    'Overall Fail',
    String(all.filter((c) => /^fail$/i.test(c.status)).length),
  ],
  [
    'Overall Blocked / N/A',
    String(
      all.filter((c) => /blocked|n\/a/i.test(c.status)).length,
    ),
  ],
  [
    'Common root cause',
    'Remote Supabase missing migrations (branches, favorites, notifications, app_settings, delivery_partners, delivery_settings, delivery_provider). Apply supabase/patches/20260727_customer_qa_schema_fix.sql and remaining delivery migrations.',
  ],
  [
    'Follow-ups',
    '1) Apply DB migrations. 2) Re-test customer Place Order after schema. 3) Fix delivery RLS for profile/address/order update. 4) Optional: set VITE_GOOGLE_MAPS_API_KEY (GPS fallback already added in code).',
  ],
].forEach((r) => summary.addRow(r))

summary.addRow([])
summary.addRow(['Persona status breakdown', ''])
summary.getRow(summary.rowCount).font = { bold: true }

for (const [name, cases] of [
  ['Customer', customer],
  ['Admin', admin],
  ['Delivery', delivery],
]) {
  const counts = countByStatus(cases)
  summary.addRow([
    name,
    Object.entries(counts)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · '),
  ])
}

// ---- All Results ----
const results = wb.addWorksheet('All Results')
results.columns = [
  { header: 'Persona', key: 'persona', width: 12 },
  { header: 'ID', key: 'id', width: 12 },
  { header: 'Area', key: 'area', width: 18 },
  { header: 'Functionality', key: 'functionality', width: 36 },
  { header: 'Steps', key: 'steps', width: 44 },
  { header: 'Expected', key: 'expected', width: 34 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Evidence / Notes', key: 'evidence', width: 70 },
]
styleHeader(results.getRow(1))

all.forEach((c) => {
  const row = results.addRow(c)
  row.alignment = { vertical: 'top', wrapText: true }
  row.getCell('status').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: statusFill(c.status) },
  }
  row.getCell('status').font = { bold: true }
})

// ---- Not Working ----
const defects = wb.addWorksheet('Not Working')
defects.columns = [
  { header: '#', key: 'n', width: 5 },
  { header: 'Persona', key: 'persona', width: 12 },
  { header: 'ID', key: 'id', width: 14 },
  { header: 'Functionality', key: 'functionality', width: 36 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Reason / Evidence', key: 'evidence', width: 80 },
]
styleHeader(defects.getRow(1))

all
  .filter((c) => /fail|blocked/i.test(c.status))
  .forEach((c, i) => {
    const row = defects.addRow({
      n: i + 1,
      persona: c.persona,
      id: c.id,
      functionality: c.functionality,
      status: c.status,
      evidence: c.evidence,
    })
    row.alignment = { vertical: 'top', wrapText: true }
    row.getCell('status').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: statusFill(c.status) },
    }
  })

// ---- Per-persona sheets ----
for (const [name, cases] of [
  ['Customer', customer],
  ['Admin', admin],
  ['Delivery', delivery],
]) {
  const sheet = wb.addWorksheet(name)
  sheet.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Area', key: 'area', width: 18 },
    { header: 'Functionality', key: 'functionality', width: 36 },
    { header: 'Steps', key: 'steps', width: 44 },
    { header: 'Expected', key: 'expected', width: 34 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Evidence / Notes', key: 'evidence', width: 70 },
  ]
  styleHeader(sheet.getRow(1))
  cases.forEach((c) => {
    const row = sheet.addRow(c)
    row.alignment = { vertical: 'top', wrapText: true }
    row.getCell('status').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: statusFill(c.status) },
    }
    row.getCell('status').font = { bold: true }
  })
}

await wb.xlsx.writeFile(outPath)

const pass = all.filter((c) => /^pass$/i.test(c.status)).length
const fail = all.filter((c) => /^fail$/i.test(c.status)).length
const other = all.length - pass - fail

console.log(`Wrote ${outPath}`)
console.log(
  JSON.stringify(
    {
      total: all.length,
      pass,
      fail,
      blockedOrNa: other,
      byPersona: {
        customer: customer.length,
        admin: admin.length,
        delivery: delivery.length,
      },
    },
    null,
    2,
  ),
)
