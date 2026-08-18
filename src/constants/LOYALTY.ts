/** 1 loyalty point per ₹1 spent (on delivered orders). */
export const LOYALTY_POINTS_PER_RUPEE = 1

/** 100 points = ₹10 off at checkout. */
export const LOYALTY_REDEEM_POINTS = 100
export const LOYALTY_REDEEM_VALUE = 10

/** Max redeemable points as a fraction of order subtotal (after coupon). */
export const LOYALTY_MAX_REDEEM_RATIO = 0.25

/** CGST + SGST split of ORDER_TAX_RATE (5% → 2.5% each). */
export const GST_CGST_RATE = 0.025
export const GST_SGST_RATE = 0.025
