import { useState } from 'react'
import { Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Offer } from '@/types/Offer'
import * as offerService from '@/services/offerService'
import { formatPrice } from '@/utils/format'

interface CouponInputProps {
  subtotal: number
  appliedOffer: Offer | null
  discountAmount: number
  onApply: (offer: Offer, discountAmount: number) => void
  onRemove: () => void
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

  const handleApply = async () => {
    setIsValidating(true)

    const result = await offerService.validateCoupon(code, subtotal)

    setIsValidating(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    onApply(result.data.offer, result.data.discountAmount)
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
                {appliedOffer.coupon_code} — {appliedOffer.discount_percentage}% off
                (saves {formatPrice(discountAmount)})
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
    <div className="space-y-3 rounded-[var(--radius-card)] border border-black/5 bg-surface p-4">
      <p className="text-sm font-medium text-text-primary">Have a coupon?</p>
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
          onClick={() => void handleApply()}
        >
          {isValidating ? 'Checking...' : 'Apply'}
        </Button>
      </div>
    </div>
  )
}
