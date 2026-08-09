#!/usr/bin/env node
/**
 * Local print agent for Taste of Andhra kitchen / billing thermal printers.
 *
 * Runs on the restaurant PC that can reach the printers on the LAN.
 * The admin web app POSTs print jobs here; this agent sends raw text to
 * each printer's raw TCP port (usually 9100).
 *
 * Usage:
 *   node scripts/print-agent.mjs
 *
 * Optional env:
 *   PRINT_AGENT_PORT=9101
 *   BILLING_PRINTER_HOST=192.168.1.50
 *   BILLING_PRINTER_PORT=9100
 *   KITCHEN_PRINTER_HOST=192.168.1.51
 *   KITCHEN_PRINTER_PORT=9100
 *   PRINT_AGENT_DRY_RUN=1   # log tickets instead of sending to printers
 */

import http from 'node:http'
import net from 'node:net'
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOG_DIR = join(__dirname, '..', '.print-agent-logs')

const PORT = Number(process.env.PRINT_AGENT_PORT || 9101)
const DRY_RUN = process.env.PRINT_AGENT_DRY_RUN === '1'

const PRINTERS = {
  billing: {
    host: process.env.BILLING_PRINTER_HOST || '192.168.1.50',
    port: Number(process.env.BILLING_PRINTER_PORT || 9100),
  },
  kitchen: {
    host: process.env.KITCHEN_PRINTER_HOST || '192.168.1.51',
    port: Number(process.env.KITCHEN_PRINTER_PORT || 9100),
  },
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function sendJson(res, status, body) {
  cors(res)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', reject)
  })
}

/** ESC/POS: initialize + text + feed + partial cut */
function toEscPos(text) {
  const init = Buffer.from([0x1b, 0x40])
  const body = Buffer.from(text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'), 'utf8')
  const feed = Buffer.from([0x0a, 0x0a, 0x0a])
  const cut = Buffer.from([0x1d, 0x56, 0x01])
  return Buffer.concat([init, body, feed, cut])
}

function sendRawTcp(host, port, payload) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port }, () => {
      socket.write(payload, (writeError) => {
        if (writeError) {
          socket.destroy()
          reject(writeError)
          return
        }
        socket.end()
      })
    })

    socket.setTimeout(8_000)
    socket.on('timeout', () => {
      socket.destroy()
      reject(new Error(`Timeout connecting to ${host}:${port}`))
    })
    socket.on('error', reject)
    socket.on('close', () => resolve())
  })
}

function logTicket(job) {
  try {
    mkdirSync(LOG_DIR, { recursive: true })
    const file = join(
      LOG_DIR,
      `${job.ticketType}-${job.orderNumber}-${Date.now()}.txt`,
    )
    appendFileSync(file, job.text, 'utf8')
    return file
  } catch {
    return null
  }
}

async function handlePrint(job) {
  const printerId = String(job.printerId || '')
  const printer = PRINTERS[printerId]
  if (!printer) {
    throw new Error(
      `Unknown printer id "${printerId}". Configure billing/kitchen in print-agent.`,
    )
  }

  if (!job.text || typeof job.text !== 'string') {
    throw new Error('Print job missing text payload.')
  }

  const logFile = logTicket(job)

  if (DRY_RUN) {
    return {
      ok: true,
      dryRun: true,
      printerId,
      logFile,
    }
  }

  const payload = toEscPos(job.text)
  await sendRawTcp(printer.host, printer.port, payload)

  return {
    ok: true,
    printerId,
    host: printer.host,
    port: printer.port,
    logFile,
  }
}

const server = http.createServer(async (req, res) => {
  cors(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`)

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      dryRun: DRY_RUN,
      printers: Object.keys(PRINTERS),
      endpoints: PRINTERS,
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/print') {
    try {
      const raw = await readBody(req)
      const job = JSON.parse(raw)
      const result = await handlePrint(job)
      sendJson(res, 200, result)
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return
  }

  sendJson(res, 404, { ok: false, error: 'Not found' })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[print-agent] listening on http://127.0.0.1:${PORT}`)
  console.log(`[print-agent] dry-run=${DRY_RUN}`)
  for (const [id, endpoint] of Object.entries(PRINTERS)) {
    console.log(`[print-agent] ${id} -> ${endpoint.host}:${endpoint.port}`)
  }
  console.log('[print-agent] Keep this window open while the kitchen board is in use.')
})
