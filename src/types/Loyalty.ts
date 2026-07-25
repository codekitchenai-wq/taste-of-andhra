export interface LoyaltyAccount {
  id: string
  user_id: string
  points_balance: number
  lifetime_earned: number
  created_at: string
  updated_at: string
}

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'adjust'

export interface LoyaltyTransaction {
  id: string
  account_id: string
  points: number
  transaction_type: LoyaltyTransactionType
  order_id: string | null
  note: string | null
  created_at: string
}
