export const GST_SETTINGS_KEY = 'gst_settings'

export const GST_INVOICES_DISABLED_MESSAGE =
  'This restaurant does not issue GST invoices.'

export const GST_INVOICES_GSTIN_REQUIRED_MESSAGE =
  'Add a GSTIN in Settings before issuing invoices.'

export interface GstSettings {
  /** When false, no GST is charged and customers do not see GST invoices. */
  enabled: boolean
  /** Restaurant GSTIN used on invoices when a branch has none. */
  gstin: string
}

/** Opt-in: small restaurants often are not GST-registered. */
export const DEFAULT_GST_SETTINGS: GstSettings = {
  enabled: false,
  gstin: '',
}
