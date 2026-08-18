import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { ROUTES } from '@/constants/ROUTES'
import * as paymentShareService from '@/services/paymentShareService'
import type { PaymentMethod } from '@/types/enums'
import { formatPrice } from '@/utils/format'
import {
  buildUpiPayUrl,
  buildUpiQrImageUrl,
} from '@/utils/upiPayment'

interface OrderSuccessState {
  orderId?: string
  orderNumber?: string
  paymentMethod?: PaymentMethod
  paymentShareToken?: string | null
}

export default function OrderSuccessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as OrderSuccessState | null) ?? {}
  const [payHref, setPayHref] = useState<string | null>(null)
  const [upiPreview, setUpiPreview] = useState<{
    amount: number
    vpa: string
    payeeName: string
    upiUrl: string
  } | null>(null)

  const isUpi =
    state.paymentMethod === 'pay_later' && Boolean(state.paymentShareToken)

  useEffect(() => {
    if (!isUpi || !state.paymentShareToken) return

    const token = state.paymentShareToken
    setPayHref(paymentShareService.paymentSharePath(token))

    let cancelled = false
    void (async () => {
      const result = await paymentShareService.getPaymentShareByToken(token)
      if (cancelled || !result.success) return
      const share = result.data
      if (share.paymentStatus === 'paid' || !share.upiVpa) return
      const upiUrl = buildUpiPayUrl({
        vpa: share.upiVpa,
        payeeName: share.upiPayeeName,
        amount: share.total,
        note: share.orderNumber,
      })
      if (!upiUrl) return
      setUpiPreview({
        amount: share.total,
        vpa: share.upiVpa,
        payeeName: share.upiPayeeName,
        upiUrl,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [isUpi, state.paymentShareToken])

  if (!state.orderNumber) {
    return (
      <Container as="div" className="py-16 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-3 text-text-secondary">
          We could not find your order details. Check My Orders for recent
          purchases.
        </p>
        <Button className="mt-6" onClick={() => navigate(ROUTES.ORDERS)}>
          My Orders
        </Button>
      </Container>
    )
  }

  return (
    <Container as="div" className="py-16">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
        </div>

        <h1 className="text-3xl font-bold text-text-primary">Order Placed!</h1>
        <p className="mt-3 text-text-secondary">
          {isUpi
            ? 'Complete payment with UPI below. The restaurant will confirm once the transfer arrives.'
            : 'Thank you for your order. We have received it and will start preparing your food soon.'}
        </p>

        <p className="mt-6 rounded-[var(--radius-card)] bg-surface px-6 py-4 text-sm shadow-sm">
          Order number:{' '}
          <OrderNumberDisplay
            value={state.orderNumber}
            className="text-base"
          />
        </p>

        {isUpi && upiPreview && (
          <div className="mt-6 rounded-[var(--radius-card)] bg-surface p-5 text-left shadow-md">
            <h2 className="text-center text-sm font-semibold text-text-primary">
              Pay {formatPrice(upiPreview.amount)} via UPI
            </h2>
            <div className="mt-4 flex flex-col items-center gap-2">
              <img
                src={buildUpiQrImageUrl(upiPreview.upiUrl, 240)}
                alt={`UPI QR for ${formatPrice(upiPreview.amount)}`}
                className="h-52 w-52 rounded-md bg-white p-2"
              />
              <p className="text-sm font-medium text-text-primary">
                {upiPreview.vpa}
              </p>
              <p className="text-xs text-text-secondary">{upiPreview.payeeName}</p>
              <a
                href={upiPreview.upiUrl}
                className="text-sm font-medium text-primary underline"
              >
                Open in UPI app
              </a>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {payHref && (
            <Button fullWidth className="whitespace-nowrap" onClick={() => navigate(payHref)}>
              Open payment page
            </Button>
          )}
          {state.orderId && (
            <Button
              fullWidth
              className="whitespace-nowrap"
              variant={payHref ? 'secondary' : 'primary'}
              onClick={() => navigate(ROUTES.ORDER_DETAILS(state.orderId!))}
            >
              Track order status
            </Button>
          )}
          <Button
            fullWidth
            className="whitespace-nowrap"
            variant="secondary"
            onClick={() => navigate(ROUTES.ORDERS)}
          >
            My Orders
          </Button>
          <Link to={ROUTES.MENU} className="block w-full">
            <Button variant="secondary" fullWidth>
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </Container>
  )
}
