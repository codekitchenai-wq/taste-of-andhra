/**
 * Generates docs/FEATURES_AND_FLOW.pdf from docs/FEATURES_AND_FLOW.html
 * Usage: node scripts/generate-features-flow-pdf.mjs
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const htmlPath = path.join(root, 'docs', 'FEATURES_AND_FLOW.html')
const pdfPath = path.join(root, 'docs', 'FEATURES_AND_FLOW.pdf')

if (!existsSync(htmlPath)) {
  console.error('Missing HTML source:', htmlPath)
  process.exit(1)
}

const htmlFileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`

async function generateWithPuppeteer() {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.goto(htmlFileUrl, { waitUntil: 'networkidle0', timeout: 30000 })
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '14mm', left: '12mm', right: '12mm' },
    })
    console.log('PDF written to:', pdfPath)
  } finally {
    await browser.close()
  }
}

function tryEdgePrint() {
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ]

  const edge = edgePaths.find((candidate) => existsSync(candidate))
  if (!edge) return false

  const result = spawnSync(
    edge,
    [
      '--headless',
      '--disable-gpu',
      '--no-pdf-header-footer',
      `--print-to-pdf=${pdfPath}`,
      htmlFileUrl,
    ],
    { stdio: 'inherit' },
  )

  if (result.status === 0 && existsSync(pdfPath)) {
    console.log('PDF written to:', pdfPath)
    return true
  }

  return false
}

try {
  await generateWithPuppeteer()
} catch (error) {
  console.warn('Puppeteer unavailable, trying Edge headless fallback…')
  console.warn(String(error))

  if (!tryEdgePrint()) {
    console.error(
      'Could not generate PDF. Install puppeteer: npm install --save-dev puppeteer',
    )
    process.exit(1)
  }
}
