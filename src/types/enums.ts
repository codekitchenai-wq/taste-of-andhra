export type UserRole = 'customer' | 'admin' | 'delivery' | 'platform_master'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export type PaymentMethod = 'cod' | 'razorpay'

export type SpiceLevel = 'mild' | 'medium' | 'hot' | 'extra_hot'
