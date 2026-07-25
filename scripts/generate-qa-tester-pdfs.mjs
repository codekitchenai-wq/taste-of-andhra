/**
 * Generates QA tester PDFs from HTML sources.
 * Usage: node scripts/generate-qa-tester-pdfs.mjs
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const docsDir = path.join(root, 'docs')

const targets = [
  {
    html: path.join(docsDir, 'QA_TESTER_1.html'),
    pdf: path.join(docsDir, 'QA_TESTER_1.pdf'),
  },
  {
    html: path.join(docsDir, 'QA_TESTER_2.html'),
    pdf: path.join(docsDir, 'QA_TESTER_2.pdf'),
  },
]

function toFileUrl(filePath) {
  return `file:///${filePath.replace(/\\/g, '/')}`
}

async function generateWithPuppeteer(htmlPath, pdfPath) {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.goto(toFileUrl(htmlPath), {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '14mm', left: '12mm', right: '12mm' },
    })
  } finally {
    await browser.close()
  }
}

function generateWithEdge(htmlPath, pdfPath) {
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
      toFileUrl(htmlPath),
    ],
    { stdio: 'inherit' },
  )

  return result.status === 0 && existsSync(pdfPath)
}

for (const { html, pdf } of targets) {
  if (!existsSync(html)) {
    console.error('Missing HTML source:', html)
    process.exit(1)
  }

  let ok = false

  try {
    await generateWithPuppeteer(html, pdf)
    ok = existsSync(pdf)
  } catch (error) {
    console.warn('Puppeteer unavailable, trying Edge headless…')
    console.warn(String(error))
    ok = generateWithEdge(html, pdf)
  }

  if (!ok) {
    console.error('Could not generate PDF for:', html)
    process.exit(1)
  }

  console.log('PDF written to:', pdf)
}

console.log('Done — both tester PDFs are ready.')
