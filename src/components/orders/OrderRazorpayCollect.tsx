import { useState } from 'react'
import toast from 'react-hot-toast'
import { PaymentCheckoutModal } from '@/components/checkout/PaymentCheckoutModal'
import { Button } from '@/components/ui/Button'
import type { OnlinePaymentChannel } from '@/constants/PAYMENT_METHOD'
import {
  isRazorpayConfigured,
  processOnlinePayment,
} from '@/services/paymentService'
import type { OrderFullDetails } from '@/types/Order'
import { formatPrice } from '@/utils/format'

interface OrderRazorpayCollectProps {
  order: OrderFullDetails
  onMarkedPaid?: (order: OrderFullDetails) => void
}

/** Counter / phone orders that chose Pay now but still have pending payment. */
export function OrderRazorpayCollect({
  order,
  onMarkedPaid,
}: OrderRazorpayCollectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  const visible =
    order.payment_method === 'razorpay' && order.payment_status === 'pending'

  if (!visible) return null

  const handlePay = async (channel: OnlinePaymentChannel) => {
    setIsPaying(true)
    const result = await processOnlinePayment({
      orderId: order.id,
      orderNumber: order.order_number,
      amount: order.total,
      channel,
      customerName:
        order.guest_name?.trim() ||
        order.address?.full_name ||
        'Customer',
      customerPhone:
        order.guest_phone?.trim() || order.address?.phone || undefined,
    })
    setIsPaying(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setIsOpen(false)
    toast.success(
      result.data.mode === 'demo'
        ? 'Payment recorded (demo mode)'
        : 'Payment successful',
    )
    onMarkedPaid?.({
      ...order,
      payment_status: 'paid',
      payment: order.payment
        ? {
            ...order.payment,
            status: 'paid',
            transaction_id: result.data.transactionId,
            paid_at: new Date().toISOString(),
          }
        : order.payment,
    })
  }

  return (
    <>
      <div className="rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-3">
        <p className="text-sm font-medium text-text-primary">
          Collect {formatPrice(order.total)} via Razorpay
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          UPI, card, net banking, or wallet at the counter.
          {!isRazorpayConfigured() ? ' Demo mode until keys are set.' : ''}
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-2"
          onClick={() => setIsOpen(true)}
        >
          Open payment
        </Button>
      </div>

      <PaymentCheckoutModal
        isOpen={isOpen}
        amount={order.total}
        orderNumber={order.order_number}
        isProcessing={isPaying}
        isDemoMode={!isRazorpayConfigured()}
        onClose={() => {
          if (!isPaying) setIsOpen(false)
        }}
        onPay={(channel) => void handlePay(channel)}
      />
    </>
  )
}
