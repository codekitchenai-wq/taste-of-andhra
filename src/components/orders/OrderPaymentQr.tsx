import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { APP_NAME } from '@/constants/APP'
import * as paymentService from '@/services/paymentService'
import * as settingsService from '@/services/settingsService'
import type { OrderFullDetails } from '@/types/Order'
import { formatPrice } from '@/utils/format'
import {
  buildUpiPayUrl,
  buildUpiQrImageUrl,
  canShowPayLaterQr,
} from '@/utils/upiPayment'

interface OrderPaymentQrProps {
  order: OrderFullDetails
  onMarkedPaid?: (order: OrderFullDetails) => void
}

export function OrderPaymentQr({ order, onMarkedPaid }: OrderPaymentQrProps) {
  const [vpa, setVpa] = useState('')
  const [payeeName, setPayeeName] = useState(APP_NAME)
  const [isLoading, setIsLoading] = useState(true)
  const [isMarking, setIsMarking] = useState(false)

  const visible = canShowPayLaterQr({
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    orderStatus: order.order_status,
    fulfillmentType: order.fulfillment_type,
  })

  useEffect(() => {
    if (!visible) return

    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      const result = await settingsService.getUpiSettings()
      if (cancelled) return
      if (result.success) {
        setVpa(result.data.vpa)
        setPayeeName(result.data.payeeName)
      }
      setIsLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [visible])

  if (!visible) return null

  const upiUrl = buildUpiPayUrl({
    vpa,
    payeeName,
    amount: order.total,
    note: order.order_number,
  })

  const handleMarkPaid = async () => {
    setIsMarking(true)
    const result = await paymentService.markPaymentCollected(order.id)
    setIsMarking(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Payment marked as collected')
    onMarkedPaid?.({
      ...order,
      payment_status: 'paid',
      payment: result.data,
    })
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
      <h3 className="font-semibold text-text-primary">Collect payment (UPI QR)</h3>
      <p className="mt-1 text-sm text-text-secondary">
        Customer can scan this QR for {formatPrice(order.total)}. Mark paid after
        the transfer arrives.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-text-secondary">Loading UPI settings…</p>
      ) : !upiUrl ? (
        <p className="mt-4 rounded-[var(--radius-input)] bg-warning/15 px-3 py-2 text-sm text-text-primary">
          Set the restaurant UPI ID in Admin → Settings to generate a payment QR.
        </p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-3">
          <img
            src={buildUpiQrImageUrl(upiUrl)}
            alt={`UPI QR for ${formatPrice(order.total)}`}
            className="h-56 w-56 rounded-md bg-white p-2"
          />
          <p className="text-sm font-medium text-text-primary">
            {formatPrice(order.total)} · {vpa}
          </p>
          <p className="text-xs text-text-secondary">{payeeName}</p>
        </div>
      )}

      <div className="mt-4">
        <Button
          type="button"
          variant="success"
          onClick={() => void handleMarkPaid()}
          disabled={isMarking}
        >
          {isMarking ? 'Saving…' : 'Mark payment collected'}
        </Button>
      </div>
    </section>
  )
}
