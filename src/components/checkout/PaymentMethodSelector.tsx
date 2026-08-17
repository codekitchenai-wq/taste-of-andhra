import { useEffect, useState } from 'react'
import { Banknote, CreditCard, QrCode } from 'lucide-react'
import { PAYMENT_METHOD } from '@/constants/PAYMENT_METHOD'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { isRazorpayConfigured } from '@/services/paymentService'
import { supabase } from '@/services/supabaseClient'
import type { PaymentMethod } from '@/types/enums'
import { cn } from '@/utils/cn'

interface PaymentMethodSelectorProps {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
  organizationId?: string
}

async function orgHasFeature(
  organizationId: string,
  featureKey: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_feature', {
    target_org_id: organizationId,
    feature_key: featureKey,
  })
  if (error) {
    // Fail open for Direct UPI (starter default); fail closed for Razorpay.
    if (featureKey === 'payments_direct_upi') return true
    return false
  }
  return Boolean(data)
}

export function PaymentMethodSelector({
  value,
  onChange,
  organizationId = DEFAULT_ORGANIZATION_ID,
}: PaymentMethodSelectorProps) {
  const razorpayReady = isRazorpayConfigured()
  const [directUpiEnabled, setDirectUpiEnabled] = useState(true)
  const [razorpayEnabled, setRazorpayEnabled] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [upi, razor] = await Promise.all([
        orgHasFeature(organizationId, 'payments_direct_upi'),
        orgHasFeature(organizationId, 'payments_razorpay'),
      ])
      if (cancelled) return
      setDirectUpiEnabled(upi)
      setRazorpayEnabled(razor)

      // If current selection is no longer offered, fall back.
      if (value === 'razorpay' && !razor) {
        onChange(upi ? 'pay_later' : 'cod')
      } else if (value === 'pay_later' && !upi) {
        onChange(razor ? 'razorpay' : 'cod')
      }
    })()
    return () => {
      cancelled = true
    }
    // Only re-check when org changes; avoid fighting user selection every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [organizationId])

  return (
    <div className="space-y-3" role="radiogroup" aria-label="Payment method">
      {directUpiEnabled && (
        <button
          type="button"
          role="radio"
          aria-checked={value === 'pay_later'}
          onClick={() => onChange('pay_later')}
          className={cn(
            'flex w-full items-start gap-3 rounded-[var(--radius-card)] border p-4 text-left transition-colors',
            value === 'pay_later'
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 bg-surface hover:border-primary/30',
          )}
        >
          <QrCode
            className={cn(
              'mt-0.5 h-5 w-5 shrink-0',
              value === 'pay_later' ? 'text-primary' : 'text-text-secondary',
            )}
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-text-primary">
              {PAYMENT_METHOD.pay_later}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Pay the restaurant directly via UPI QR. Staff confirms when the
              transfer arrives — no gateway fee.
            </p>
          </div>
        </button>
      )}

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
            Pay in cash when your order is delivered or at the counter.
          </p>
        </div>
      </button>

      {razorpayEnabled && (
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
      )}
    </div>
  )
}
