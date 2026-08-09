export type PrinterTicketType = 'billing' | 'kitchen'

export type PrinterMode = 'browser' | 'agent'

export interface PrinterEndpointSettings {
  /** Display name for the station (e.g. Billing Counter). */
  label: string
  /** Enable auto-print for this ticket type. */
  enabled: boolean
  /**
   * Local print-agent printer id (e.g. billing / kitchen).
   * Used when mode is `agent`.
   */
  agentPrinterId: string
}

export interface PrinterSettings {
  /** Master switch — when off, nothing auto-prints. */
  enabled: boolean
  /**
   * `browser` — OS print dialog / default printers via HTML tickets.
   * `agent` — POST jobs to a local print agent that talks to thermal printers.
   */
  mode: PrinterMode
  /** Local agent base URL, e.g. http://127.0.0.1:9101 */
  agentUrl: string
  /** Auto-print when an order becomes confirmed (all sources). */
  autoPrintOnConfirm: boolean
  billing: PrinterEndpointSettings
  kitchen: PrinterEndpointSettings
}

export interface PrintTicketItem {
  quantity: number
  name: string
  unitPrice?: number
  lineTotal?: number
  modifiers?: string[]
}

export interface PrintTicketPayload {
  ticketType: PrinterTicketType
  restaurantName: string
  orderNumber: string
  orderId: string
  createdAt: string
  customerName: string
  customerPhone: string | null
  fulfillmentType: 'delivery' | 'pickup'
  orderSource: 'app' | 'phone'
  paymentMethod: string
  paymentStatus: string
  specialInstructions: string | null
  addressLines: string[]
  items: PrintTicketItem[]
  subtotal?: number
  tax?: number
  deliveryCharge?: number
  discount?: number
  total?: number
}

export interface PrintJobRequest {
  printerId: string
  ticketType: PrinterTicketType
  /** Plain text for ESC/POS thermal printers. */
  text: string
  /** Optional HTML for browser / agent preview. */
  html: string
  orderNumber: string
  orderId: string
}
