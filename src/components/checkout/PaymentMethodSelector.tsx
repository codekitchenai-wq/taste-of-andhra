import { Banknote, CreditCard } from 'lucide-react'
import { PAYMENT_METHOD } from '@/constants/PAYMENT_METHOD'
import { isRazorpayConfigured } from '@/services/paymentService'
import type { PaymentMethod } from '@/types/enums'
import { cn } from '@/utils/cn'

interface PaymentMethodSelectorProps {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

export function PaymentMethodSelector({
  value,
  onChange,
}: PaymentMethodSelectorProps) {
  const razorpayReady = isRazorpayConfigured()

  return (
    <div className="space-y-3" role="radiogroup" aria-label="Payment method">
      <button
        type="button"
        role="radio"
        aria-checked={value === 'cod'}
        onClick={() => onChange('cod')}
        className={cn(
          'flex w-full items-start gap-3 rounded-[var(--radius-card)] border p-4 text-left transition-colors',
          value === 'cod'
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 bg-surface hover:border-primary/30',
        )}
      >
        <Banknote
          className={cn(
            'mt-0.5 h-5 w-5 shrink-0',
            value === 'cod' ? 'text-primary' : 'text-text-secondary',
          )}
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-text-primary">{PAYMENT_METHOD.cod}</p>
          <p className="mt-1 text-sm text-text-secondary">
            Pay in cash when your order is delivered.
          </p>
        </div>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={value === 'razorpay'}
        onClick={() => onChange('razorpay')}
        className={cn(
          'flex w-full items-start gap-3 rounded-[var(--radius-card)] border p-4 text-left transition-colors',
          value === 'razorpay'
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 bg-surface hover:border-primary/30',
        )}
      >
        <CreditCard
          className={cn(
            'mt-0.5 h-5 w-5 shrink-0',
            value === 'razorpay' ? 'text-primary' : 'text-text-secondary',
          )}
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-text-primary">
            {PAYMENT_METHOD.razorpay}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            UPI, Cards, Net Banking, and Wallets
            {!razorpayReady && ' · Demo mode until Razorpay keys are added'}
          </p>
        </div>
      </button>
    </div>
  )
}
