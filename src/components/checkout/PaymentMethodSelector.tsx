import { Banknote, CreditCard } from 'lucide-react'
import { PAYMENT_METHOD } from '@/constants/PAYMENT_METHOD'
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
  return (
    <div className="space-y-3">
      <button
        type="button"
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
          <p className="font-semibold text-text-primary">
            {PAYMENT_METHOD.cod}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Pay when your order is delivered.
          </p>
        </div>
      </button>

      <div
        className="flex items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-gray-200 bg-background p-4 opacity-60"
        aria-disabled="true"
      >
        <CreditCard
          className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-text-primary">
            {PAYMENT_METHOD.razorpay}
          </p>
          <p className="mt-1 text-sm text-text-secondary">Coming soon</p>
        </div>
      </div>
    </div>
  )
}
