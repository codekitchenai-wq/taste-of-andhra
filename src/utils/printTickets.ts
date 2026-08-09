import { APP_NAME } from '@/constants/APP'
import { PAYMENT_METHOD } from '@/constants/PAYMENT_METHOD'
import type { AdminOrder } from '@/services/orderService'
import type {
  PrintTicketItem,
  PrintTicketPayload,
  PrinterTicketType,
} from '@/types/Printer'
import type { OrderFullDetails } from '@/types/Order'
import { formatDateTime, formatPrice } from '@/utils/format'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function padRight(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width)
  return text + ' '.repeat(width - text.length)
}

function padLeft(text: string, width: number): string {
  if (text.length >= width) return text.slice(-width)
  return ' '.repeat(width - text.length) + text
}

function center(text: string, width = 32): string {
  if (text.length >= width) return text.slice(0, width)
  const left = Math.floor((width - text.length) / 2)
  return ' '.repeat(left) + text
}

function line(char = '-', width = 32): string {
  return char.repeat(width)
}

function buildAddressLines(order: AdminOrder | OrderFullDetails): string[] {
  if ('address' in order && order.address) {
    const a = order.address
    return [
      a.address_line1,
      a.address_line2,
      a.landmark,
      [a.city, a.state, a.pincode].filter(Boolean).join(', '),
    ].filter((part): part is string => Boolean(part?.trim()))
  }

  return [
    order.guest_address_line1,
    order.guest_address_line2,
    order.guest_landmark,
    [order.guest_city, order.guest_state, order.guest_pincode]
      .filter(Boolean)
      .join(', '),
  ].filter((part): part is string => Boolean(part?.trim()))
}

function itemsFromAdminOrder(order: AdminOrder): PrintTicketItem[] {
  return order.items.map((item) => ({
    quantity: item.quantity,
    name: item.name,
    unitPrice: item.unitPrice,
    lineTotal:
      typeof item.unitPrice === 'number'
        ? item.unitPrice * item.quantity
        : undefined,
    modifiers: item.modifiers,
  }))
}

function itemsFromOrderDetails(order: OrderFullDetails): PrintTicketItem[] {
  return order.items.map((item) => ({
    quantity: item.quantity,
    name: item.dish_name_snapshot || item.dish?.name || 'Item',
    unitPrice: item.price,
    lineTotal: item.total,
    modifiers: item.modifiers_snapshot.map((mod) => {
      const delta =
        mod.price_delta !== 0
          ? ` (${mod.price_delta > 0 ? '+' : ''}${formatPrice(mod.price_delta)})`
          : ''
      return `${mod.modifier_name}${delta}`
    }),
  }))
}

function isOrderFullDetails(
  order: AdminOrder | OrderFullDetails,
): order is OrderFullDetails {
  const first = order.items[0]
  return Boolean(first && 'modifiers_snapshot' in first)
}

export function buildPrintTicketPayload(
  order: AdminOrder | OrderFullDetails,
  ticketType: PrinterTicketType,
  restaurantName = APP_NAME,
): PrintTicketPayload {
  const items = isOrderFullDetails(order)
    ? itemsFromOrderDetails(order)
    : itemsFromAdminOrder(order)

  const customerName =
    'customer_name' in order
      ? order.customer_name
      : order.guest_name?.trim() || 'Customer'

  const customerPhone =
    'customer_phone' in order ? order.customer_phone : order.guest_phone

  return {
    ticketType,
    restaurantName,
    orderNumber: order.order_number,
    orderId: order.id,
    createdAt: order.created_at,
    customerName,
    customerPhone,
    fulfillmentType: order.fulfillment_type,
    orderSource: order.order_source,
    paymentMethod: PAYMENT_METHOD[order.payment_method] ?? order.payment_method,
    paymentStatus: order.payment_status,
    specialInstructions: order.special_instructions,
    addressLines: buildAddressLines(order),
    items,
    subtotal: order.subtotal,
    tax: order.tax,
    deliveryCharge: order.delivery_charge,
    discount: order.discount,
    total: order.total,
  }
}

export function buildTicketText(payload: PrintTicketPayload): string {
  const width = 32
  const lines: string[] = []
  const isKitchen = payload.ticketType === 'kitchen'

  lines.push(center(payload.restaurantName.toUpperCase(), width))
  lines.push(center(isKitchen ? '*** KITCHEN KOT ***' : '*** BILL / RECEIPT ***', width))
  lines.push(line('=', width))
  lines.push(`Order: ${payload.orderNumber}`)
  lines.push(formatDateTime(payload.createdAt))
  lines.push(
    `${payload.fulfillmentType === 'pickup' ? 'PICKUP' : 'DELIVERY'} | ${
      payload.orderSource === 'phone' ? 'PHONE' : 'APP'
    }`,
  )
  lines.push(line('-', width))
  lines.push(`Customer: ${payload.customerName}`)
  if (payload.customerPhone) lines.push(`Phone: ${payload.customerPhone}`)

  if (!isKitchen && payload.addressLines.length) {
    lines.push('Address:')
    for (const addr of payload.addressLines) lines.push(`  ${addr}`)
  }

  lines.push(line('-', width))
  lines.push(isKitchen ? 'ITEMS' : padRight('ITEM', 20) + padLeft('AMT', 12))
  lines.push(line('-', width))

  for (const item of payload.items) {
    const qtyName = `${item.quantity}x ${item.name}`
    if (isKitchen) {
      lines.push(qtyName)
    } else {
      const amount =
        typeof item.lineTotal === 'number' ? formatPrice(item.lineTotal) : ''
      if (qtyName.length <= 20) {
        lines.push(padRight(qtyName, 20) + padLeft(amount, 12))
      } else {
        lines.push(qtyName)
        if (amount) lines.push(padLeft(amount, width))
      }
    }

    for (const mod of item.modifiers ?? []) {
      lines.push(isKitchen ? `  + ${mod}` : `  + ${mod}`)
    }
  }

  if (payload.specialInstructions?.trim()) {
    lines.push(line('-', width))
    lines.push('NOTE:')
    lines.push(payload.specialInstructions.trim())
  }

  if (!isKitchen) {
    lines.push(line('-', width))
    lines.push(
      padRight('Subtotal', 20) +
        padLeft(formatPrice(payload.subtotal ?? 0), 12),
    )
    if ((payload.tax ?? 0) > 0) {
      lines.push(
        padRight('Tax', 20) + padLeft(formatPrice(payload.tax ?? 0), 12),
      )
    }
    if ((payload.deliveryCharge ?? 0) > 0) {
      lines.push(
        padRight('Delivery', 20) +
          padLeft(formatPrice(payload.deliveryCharge ?? 0), 12),
      )
    }
    if ((payload.discount ?? 0) > 0) {
      lines.push(
        padRight('Discount', 20) +
          padLeft(`-${formatPrice(payload.discount ?? 0)}`, 12),
      )
    }
    lines.push(line('=', width))
    lines.push(
      padRight('TOTAL', 20) + padLeft(formatPrice(payload.total ?? 0), 12),
    )
    lines.push(`Pay: ${payload.paymentMethod}`)
    lines.push(`Status: ${payload.paymentStatus.toUpperCase()}`)
  }

  lines.push(line('=', width))
  lines.push(center(isKitchen ? 'Prepare with care' : 'Thank you!', width))
  lines.push('')
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

export function buildTicketHtml(payload: PrintTicketPayload): string {
  const isKitchen = payload.ticketType === 'kitchen'
  const title = isKitchen ? 'KITCHEN KOT' : 'BILL / RECEIPT'

  const itemRows = payload.items
    .map((item) => {
      const mods = (item.modifiers ?? [])
        .map((mod) => `<div class="mod">+ ${escapeHtml(mod)}</div>`)
        .join('')
      const amount =
        !isKitchen && typeof item.lineTotal === 'number'
          ? `<td class="amt">${escapeHtml(formatPrice(item.lineTotal))}</td>`
          : isKitchen
            ? ''
            : '<td class="amt"></td>'

      return `<tr>
        <td class="qty">${item.quantity}x</td>
        <td class="name">${escapeHtml(item.name)}${mods}</td>
        ${amount}
      </tr>`
    })
    .join('')

  const addressBlock =
    !isKitchen && payload.addressLines.length
      ? `<div class="meta">${payload.addressLines
          .map((line) => escapeHtml(line))
          .join('<br/>')}</div>`
      : ''

  const moneyBlock = !isKitchen
    ? `<div class="totals">
        <div><span>Subtotal</span><span>${escapeHtml(formatPrice(payload.subtotal ?? 0))}</span></div>
        ${(payload.tax ?? 0) > 0 ? `<div><span>Tax</span><span>${escapeHtml(formatPrice(payload.tax ?? 0))}</span></div>` : ''}
        ${(payload.deliveryCharge ?? 0) > 0 ? `<div><span>Delivery</span><span>${escapeHtml(formatPrice(payload.deliveryCharge ?? 0))}</span></div>` : ''}
        ${(payload.discount ?? 0) > 0 ? `<div><span>Discount</span><span>-${escapeHtml(formatPrice(payload.discount ?? 0))}</span></div>` : ''}
        <div class="grand"><span>TOTAL</span><span>${escapeHtml(formatPrice(payload.total ?? 0))}</span></div>
        <div><span>Payment</span><span>${escapeHtml(payload.paymentMethod)} · ${escapeHtml(payload.paymentStatus)}</span></div>
      </div>`
    : ''

  const note = payload.specialInstructions?.trim()
    ? `<div class="note"><strong>NOTE:</strong> ${escapeHtml(payload.specialInstructions.trim())}</div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} ${escapeHtml(payload.orderNumber)}</title>
  <style>
    @page { margin: 4mm; size: 80mm auto; }
    body {
      font-family: "Courier New", Courier, monospace;
      font-size: 12px;
      color: #000;
      margin: 0;
      width: 72mm;
    }
    h1 { font-size: 14px; margin: 0 0 4px; text-align: center; }
    h2 { font-size: 13px; margin: 0 0 8px; text-align: center; letter-spacing: 0.04em; }
    .meta { margin: 4px 0; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 2px 0; }
    .qty { width: 18%; font-weight: 700; }
    .amt { width: 28%; text-align: right; white-space: nowrap; }
    .mod { font-size: 11px; padding-left: 2px; }
    .totals div { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
    .grand { font-weight: 700; font-size: 13px; margin-top: 4px; }
    .note { margin-top: 8px; font-weight: 700; }
    .footer { text-align: center; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(payload.restaurantName)}</h1>
  <h2>${title}</h2>
  <div class="meta">
    <strong>Order:</strong> ${escapeHtml(payload.orderNumber)}<br/>
    ${escapeHtml(formatDateTime(payload.createdAt))}<br/>
    ${payload.fulfillmentType === 'pickup' ? 'PICKUP' : 'DELIVERY'}
    · ${payload.orderSource === 'phone' ? 'PHONE' : 'APP'}
  </div>
  <hr />
  <div class="meta">
    <strong>${escapeHtml(payload.customerName)}</strong><br/>
    ${payload.customerPhone ? escapeHtml(payload.customerPhone) : ''}
  </div>
  ${addressBlock}
  <hr />
  <table>${itemRows}</table>
  ${note}
  ${moneyBlock}
  <div class="footer">${isKitchen ? 'Prepare with care' : 'Thank you!'}</div>
</body>
</html>`
}
