import { useEffect, useState } from 'react'
import { Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Offer } from '@/types/Offer'
import * as offerService from '@/services/offerService'
import { cn } from '@/utils/cn'
import { formatPrice } from '@/utils/format'

interface CouponInputProps {
  subtotal: number
  appliedOffer: Offer | null
  discountAmount: number
  onApply: (offer: Offer, discountAmount: number) => void
  onRemove: () => void
}

function estimateDiscount(offer: Offer, subtotal: number): number {
  return Math.round(subtotal * (offer.discount_percentage / 100) * 100) / 100
}

export function CouponInput({
  subtotal,
  appliedOffer,
  discountAmount,
  onApply,
  onRemove,
}: CouponInputProps) {
  const [code, setCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [availableCoupons, setAvailableCoupons] = useState<Offer[]>([])
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(true)

  useEffect(() => {
    let cancelled = false

    void offerService.getActiveOffers().then((result) => {
      if (cancelled) return
      setIsLoadingCoupons(false)

      if (!result.success) {
        setAvailableCoupons([])
        return
      }

      setAvailableCoupons(
        result.data.filter(
          (offer) => Boolean(offer.coupon_code?.trim()),
        ),
      )
    })

    return () => {
      cancelled = true
    }
  }, [])

  const applyCode = async (rawCode: string) => {
    const trimmed = rawCode.trim()
    if (!trimmed) return

    setIsValidating(true)
    const result = await offerService.validateCoupon(trimmed, subtotal)
    setIsValidating(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    onApply(result.data.offer, result.data.discountAmount)
    setCode('')
    toast.success(`Coupon applied: ${result.data.offer.title}`)
  }

  if (appliedOffer) {
    return (
      <div className="rounded-[var(--radius-card)] border border-success/30 bg-success/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Tag className="mt-0.5 h-5 w-5 text-success" aria-hidden="true" />
            <div>
              <p className="font-medium text-text-primary">
                {appliedOffer.title}
              </p>
              <p className="text-sm text-text-secondary">
                {appliedOffer.coupon_code} — {appliedOffer.discount_percentage}%
                off (saves {formatPrice(discountAmount)})
              </p>
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-black/5 bg-surface p-4">
      <div className="space-y-3">
        <p className="text-sm font-medium text-text-primary">
          Available coupons
        </p>

        {isLoadingCoupons ? (
          <p className="text-sm text-text-secondary">Loading coupons...</p>
        ) : availableCoupons.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No active coupons right now. You can still enter a code below.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Available coupon codes">
            {availableCoupons.map((offer) => {
              const codeLabel = offer.coupon_code?.trim() ?? ''
              const meetsMinimum = subtotal >= offer.minimum_order
              const savings = estimateDiscount(offer, subtotal)

              return (
                <li key={offer.id}>
                  <button
                    type="button"
                    disabled={!meetsMinimum || isValidating}
                    onClick={() => void applyCode(codeLabel)}
                    className={cn(
                      'flex w-full items-start justify-between gap-3 rounded-[var(--radius-button)] border bg-background px-3 py-3 text-left transition-colors',
                      meetsMinimum
                        ? 'border-gray-200 hover:border-primary/40'
                        : 'cursor-not-allowed border-gray-100 opacity-60',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold tracking-wide text-primary">
                        {codeLabel}
                      </p>
                      <p className="mt-0.5 text-sm text-text-primary">
                        {offer.title}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {offer.discount_percentage}% off
                        {offer.minimum_order > 0
                          ? ` · min order ${formatPrice(offer.minimum_order)}`
                          : ' · no minimum'}
                        {meetsMinimum ? ` · save ${formatPrice(savings)}` : ''}
                      </p>
                      {!meetsMinimum && (
                        <p className="mt-1 text-xs text-error">
                          Add{' '}
                          {formatPrice(offer.minimum_order - subtotal)} more to
                          unlock
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-medium text-primary">
                      {meetsMinimum ? 'Apply' : 'Locked'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="space-y-2 border-t border-black/5 pt-3">
        <p className="text-sm font-medium text-text-primary">
          Have another code?
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Enter coupon code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            aria-label="Coupon code"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!code.trim() || isValidating}
            onClick={() => void applyCode(code)}
          >
            {isValidating ? 'Checking...' : 'Apply'}
          </Button>
        </div>
      </div>
    </div>
  )
}
