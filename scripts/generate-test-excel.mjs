/**
 * Generates docs/TASTE_OF_ANDHRA_TEST_CASES.xlsx
 * Usage: node scripts/generate-test-excel.mjs
 */
import ExcelJS from 'exceljs'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dataPath = path.join(root, 'docs', 'test-cases-data.json')
const outputPath = path.join(root, 'docs', 'TASTE_OF_ANDHRA_TEST_CASES.xlsx')

const testCases = JSON.parse(readFileSync(dataPath, 'utf8'))

const COLORS = {
  header: 'FFC62828',
  headerFont: 'FFFFFFFF',
  input: 'FFFFF9C4',
  inputAlt: 'FFFFFDE7',
  section: 'FFE3F2FD',
  pass: 'FFE8F5E9',
  fail: 'FFFFEBEE',
}

const STATUS_OPTIONS = ['Not Run', 'Pass', 'Fail', 'Blocked', 'N/A']
const ENV_OPTIONS = ['Local', 'Staging', 'Production']
const SEVERITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low']
const DEFECT_STATUS_OPTIONS = [
  'Open',
  'In Progress',
  'Fixed',
  'Ready for Retest',
  'Verified',
  'Closed',
  "Won't Fix",
]

function styleHeaderRow(row, fillColor = COLORS.header) {
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillColor },
    }
    cell.font = { bold: true, color: { argb: COLORS.headerFont }, size: 11 }
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  })
  row.height = 28
}

function applyInputStyle(cell, alt = false) {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: alt ? COLORS.inputAlt : COLORS.input },
  }
  cell.alignment = { vertical: 'top', wrapText: true }
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  }
}

function addListValidation(sheet, cellAddress, options) {
  sheet.dataValidations.add(cellAddress, {
    type: 'list',
    allowBlank: true,
    formulae: [`"${options.join(',')}"`],
    showErrorMessage: true,
    errorTitle: 'Invalid value',
    error: `Choose one of: ${options.join(', ')}`,
  })
}

const workbook = new ExcelJS.Workbook()
workbook.creator = 'The Taste of Andhra QA'
workbook.created = new Date()

// ── Sheet 1: Instructions ──
const instructions = workbook.addWorksheet('Instructions', {
  views: [{ showGridLines: false }],
})

instructions.columns = [{ width: 100 }]
const instructionLines = [
  'THE TASTE OF ANDHRA — TEST CASE WORKBOOK',
  '',
  'HOW TO USE THIS FILE',
  '',
  '1. Test Cases sheet',
  '   • Execute each test in the Steps column.',
  '   • Record what you actually observed in Actual Result.',
  '   • Set Status: Not Run | Pass | Fail | Blocked | N/A',
  '   • If Status = Fail or Blocked, log a defect in the Defect Log sheet and enter the Defect ID (e.g. DEF-001) in the Test Cases row.',
  '   • Fill Tester Name, Test Date, Build/Version, and Environment for traceability.',
  '',
  '2. Defect Log sheet',
  '   • Create one row per defect found during testing.',
  '   • Link Related Test ID(s) to the failing test case(s).',
  '   • Developers update Defect Status and Resolution Notes when fixed.',
  '   • Testers re-run the linked test case and set Status to Pass after verification.',
  '',
  '3. Test Summary sheet',
  '   • Auto-calculates pass/fail counts from Test Cases (update after filling Status column).',
  '',
  '4. Test Environment Checklist (complete before testing)',
  '   ☐ Supabase migrations applied',
  '   ☐ Phone OTP provider enabled (or test numbers configured)',
  '   ☐ .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
  '   ☐ seed_menu.sql run (optional sample data)',
  '   ☐ Admin user created and promoted',
  '',
  'PRIORITY LEGEND: P1 = Critical path | P2 = Important | P3 = Nice to verify',
  '',
  'REGENERATE THIS FILE: npm run docs:test-excel',
]

instructionLines.forEach((line, index) => {
  const row = instructions.getRow(index + 1)
  row.getCell(1).value = line
  if (index === 0) {
    row.getCell(1).font = { bold: true, size: 16, color: { argb: COLORS.header } }
  } else if (line.startsWith('HOW TO') || line.startsWith('PRIORITY')) {
    row.getCell(1).font = { bold: true, size: 12 }
  }
})

// ── Sheet 2: Test Cases ──
const tests = workbook.addWorksheet('Test Cases', {
  views: [{ state: 'frozen', ySplit: 1 }],
})

const testHeaders = [
  'Test ID',
  'Module',
  'Priority',
  'Test Case',
  'Steps',
  'Expected Result',
  'Actual Result',
  'Status',
  'Defect ID',
  'Tester Name',
  'Test Date',
  'Build / Version',
  'Environment',
  'Comments / Notes',
]

tests.columns = [
  { key: 'id', width: 12 },
  { key: 'module', width: 22 },
  { key: 'priority', width: 10 },
  { key: 'title', width: 28 },
  { key: 'steps', width: 36 },
  { key: 'expected', width: 36 },
  { key: 'actual', width: 36 },
  { key: 'status', width: 12 },
  { key: 'defectId', width: 12 },
  { key: 'tester', width: 16 },
  { key: 'testDate', width: 14 },
  { key: 'build', width: 14 },
  { key: 'environment', width: 14 },
  { key: 'comments', width: 30 },
]

const headerRow = tests.addRow(testHeaders)
styleHeaderRow(headerRow)

const firstDataRow = 2
const lastDataRow = firstDataRow + testCases.length - 1

testCases.forEach((tc, index) => {
  const rowNum = firstDataRow + index
  const row = tests.addRow([
    tc.id,
    tc.module,
    tc.priority,
    tc.title,
    tc.steps,
    tc.expected,
    '',
    'Not Run',
    '',
    '',
    '',
    '',
    '',
    '',
  ])

  row.height = 48

  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.alignment = { vertical: 'top', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    }

    if (colNumber >= 7) {
      applyInputStyle(cell, index % 2 === 1)
    }
  })

  addListValidation(tests, `H${rowNum}`, STATUS_OPTIONS)
  addListValidation(tests, `M${rowNum}`, ENV_OPTIONS)
})

tests.autoFilter = {
  from: 'A1',
  to: `N${lastDataRow}`,
}

// ── Sheet 3: Defect Log ──
const defects = workbook.addWorksheet('Defect Log', {
  views: [{ state: 'frozen', ySplit: 1 }],
})

const defectHeaders = [
  'Defect ID',
  'Related Test ID(s)',
  'Module',
  'Summary / Title',
  'Description',
  'Steps to Reproduce',
  'Expected Behavior',
  'Actual Behavior',
  'Severity',
  'Defect Status',
  'Reported By',
  'Reported Date',
  'Assigned To',
  'Fixed In Version',
  'Fixed Date',
  'Verified By',
  'Verification Date',
  'Retest Test ID',
  'Resolution Notes',
  'Screenshot / Evidence Link',
]

defects.columns = defectHeaders.map((header, i) => ({
  key: `c${i}`,
  width:
    header === 'Description' ||
    header === 'Steps to Reproduce' ||
    header === 'Resolution Notes'
      ? 40
      : header.includes('Behavior') || header === 'Summary / Title'
        ? 28
        : 16,
}))

const defectHeaderRow = defects.addRow(defectHeaders)
styleHeaderRow(defectHeaderRow, 'FF1565C0')

const DEFECT_ROWS = 50
for (let i = 1; i <= DEFECT_ROWS; i++) {
  const rowNum = i + 1
  const defectId = `DEF-${String(i).padStart(3, '0')}`
  const row = defects.addRow([
    defectId,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Open',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ])

  row.height = 36

  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    applyInputStyle(cell, i % 2 === 0)
    if (colNumber === 1) {
      cell.font = { bold: true }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE3F2FD' },
      }
    }
  })

  addListValidation(defects, `I${rowNum}`, SEVERITY_OPTIONS)
  addListValidation(defects, `J${rowNum}`, DEFECT_STATUS_OPTIONS)
}

defects.autoFilter = {
  from: 'A1',
  to: `T${DEFECT_ROWS + 1}`,
}

// ── Sheet 4: Test Summary ──
const summary = workbook.addWorksheet('Test Summary', {
  views: [{ showGridLines: true }],
})

summary.columns = [{ width: 28 }, { width: 18 }, { width: 40 }]

summary.addRow(['THE TASTE OF ANDHRA — TEST EXECUTION SUMMARY']).getCell(1).font = {
  bold: true,
  size: 14,
  color: { argb: COLORS.header },
}
summary.addRow([])

const metaRows = [
  ['Project', 'The Taste of Andhra'],
  ['Test workbook version', '1.0'],
  ['Total test cases', testCases.length],
  ['Test cycle name', ''],
  ['Test lead', ''],
  ['Start date', ''],
  ['End date', ''],
  ['Build / version under test', ''],
  ['Environment', ''],
]

metaRows.forEach(([label, value]) => {
  const row = summary.addRow([label, value])
  row.getCell(1).font = { bold: true }
  applyInputStyle(row.getCell(2))
})

summary.addRow([])
summary.addRow(['RESULT COUNTS (auto-calculated from Test Cases sheet)']).getCell(1).font =
  { bold: true, size: 12 }

const statusCounts = [
  ['Pass', { formula: `COUNTIF('Test Cases'!H${firstDataRow}:H${lastDataRow},"Pass")` }],
  ['Fail', { formula: `COUNTIF('Test Cases'!H${firstDataRow}:H${lastDataRow},"Fail")` }],
  ['Blocked', { formula: `COUNTIF('Test Cases'!H${firstDataRow}:H${lastDataRow},"Blocked")` }],
  ['Not Run', { formula: `COUNTIF('Test Cases'!H${firstDataRow}:H${lastDataRow},"Not Run")` }],
  ['N/A', { formula: `COUNTIF('Test Cases'!H${firstDataRow}:H${lastDataRow},"N/A")` }],
  ['Total executed (Pass+Fail+Blocked+N/A)', {
    formula: `COUNTA('Test Cases'!H${firstDataRow}:H${lastDataRow})-COUNTIF('Test Cases'!H${firstDataRow}:H${lastDataRow},"Not Run")`,
  }],
  ['Pass rate %', {
    formula: `IFERROR(COUNTIF('Test Cases'!H${firstDataRow}:H${lastDataRow},"Pass")/(COUNTIF('Test Cases'!H${firstDataRow}:H${lastDataRow},"Pass")+COUNTIF('Test Cases'!H${firstDataRow}:H${lastDataRow},"Fail")+COUNTIF('Test Cases'!H${firstDataRow}:H${lastDataRow},"Blocked")),"0%")`,
  }],
]

statusCounts.forEach(([label, value]) => {
  const row = summary.addRow([label, value])
  row.getCell(1).font = { bold: true }
  if (label === 'Pass') row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.pass } }
  if (label === 'Fail') row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.fail } }
})

summary.addRow([])
summary.addRow(['DEFECT COUNTS (from Defect Log)']).getCell(1).font = { bold: true, size: 12 }

const defectCounts = [
  ['Open defects', { formula: 'COUNTIF(\'Defect Log\'!J:J,"Open")' }],
  ['In Progress', { formula: 'COUNTIF(\'Defect Log\'!J:J,"In Progress")' }],
  ['Fixed (awaiting retest)', { formula: 'COUNTIF(\'Defect Log\'!J:J,"Fixed")+COUNTIF(\'Defect Log\'!J:J,"Ready for Retest")' }],
  ['Verified / Closed', { formula: 'COUNTIF(\'Defect Log\'!J:J,"Verified")+COUNTIF(\'Defect Log\'!J:J,"Closed")' }],
]

defectCounts.forEach(([label, value]) => {
  const row = summary.addRow([label, value])
  row.getCell(1).font = { bold: true }
})

summary.addRow([])
summary.addRow(['Sign-off']).getCell(1).font = { bold: true, size: 12 }
;[
  ['QA sign-off (name / date)', ''],
  ['Dev sign-off (name / date)', ''],
  ['Release approved (Yes / No)', ''],
].forEach(([label]) => {
  const row = summary.addRow([label, ''])
  row.getCell(1).font = { bold: true }
  applyInputStyle(row.getCell(2))
})

await workbook.xlsx.writeFile(outputPath)
console.log(`Excel test workbook written to: ${outputPath}`)
console.log(`  • ${testCases.length} test cases`)
console.log(`  • ${DEFECT_ROWS} defect log rows (DEF-001 … DEF-${String(DEFECT_ROWS).padStart(3, '0')})`)
console.log('  • Sheets: Instructions, Test Cases, Defect Log, Test Summary')
