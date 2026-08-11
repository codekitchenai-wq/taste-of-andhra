export interface OrderNumberSequenceSettings {
  /** Short code prepended to every order number (e.g. TOA, CVR). */
  prefix: string
  /** When true, inserts YYYYMMDD between prefix and the 4-digit sequence. */
  includeDate: boolean
}

export const DEFAULT_ORDER_NUMBER_SEQUENCE: OrderNumberSequenceSettings = {
  prefix: 'TOA',
  includeDate: true,
}
