import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { APP_NAME } from '@/constants/APP'
import { ROUTES } from '@/constants/ROUTES'
import * as paymentShareService from '@/services/paymentShareService'
import type { PaymentShareView } from '@/services/paymentShareService'
import { formatPrice } from '@/utils/format'
import {
  buildUpiPayUrl,
  buildUpiQrImageUrl,
} from '@/utils/upiPayment'

export default function OrderPaymentSharePage() {
  const { token } = useParams<{ token: string }>()
  const [share, setShare] = useState<PaymentShareView | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!token) {
      setError('Payment link is invalid.')
      setShare(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    const result = await paymentShareService.getPaymentShareByToken(token)
    if (!result.success) {
      setError(result.message)
      setShare(null)
      setIsLoading(false)
      return
    }

    setShare(result.data)
    setIsLoading(false)
  }, [token])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const upiUrl =
    share && share.upiVpa && share.paymentStatus === 'pending'
      ? buildUpiPayUrl({
          vpa: share.upiVpa,
          payeeName: share.upiPayeeName,
          amount: share.total,
          note: share.orderNumber,
        })
      : null

  return (
    <Container as="div" className="py-8 md:py-12">
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">{APP_NAME}</p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">
            Order payment
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review your order details and pay by UPI.
          </p>
        </div>

        {isLoading && <LoadingState variant="inline" />}

        {!isLoading && error && (
          <ErrorState message={error} onRetry={() => void refetch()} />
        )}

        {!isLoading && share && (
          <>
            <section className="rounded-[var(--radius-card)] bg-surface p-4 shadow-md sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-text-secondary">Order</p>
                  <p className="text-lg font-semibold text-text-primary">
                    <OrderNumberDisplay value={share.orderNumber} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary">
                    {share.fulfillmentType === 'pickup'
                      ? 'Pickup'
                      : 'Delivery'}
                  </p>
                  <p className="text-sm font-medium capitalize text-text-primary">
                    {share.paymentStatus === 'paid' ? 'Paid' : 'Payment pending'}
                  </p>
                </div>
              </div>
              {share.guestName ? (
                <p className="mt-3 text-sm text-text-secondary">
                  For {share.guestName}
                </p>
              ) : null}
            </section>

            <section className="rounded-[var(--radius-card)] bg-surface p-4 shadow-md sm:p-5">
              <h2 className="text-sm font-semibold text-text-primary">
                Order details
              </h2>
              <ul className="mt-3 divide-y divide-black/5">
                {share.items.map((item, index) => (
                  <li
                    key={`${item.name}-${index}`}
                    className="flex items-start justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {item.quantity}× {item.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatPrice(item.unitPrice)} each
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-text-primary">
                      {formatPrice(item.lineTotal)}
                    </p>
                  </li>
                ))}
              </ul>

              <dl className="mt-3 space-y-1.5 border-t border-black/5 pt-3 text-sm">
                <div className="flex justify-between text-text-secondary">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(share.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <dt>GST (5%)</dt>
                  <dd>{formatPrice(share.tax)}</dd>
                </div>
                {share.deliveryCharge > 0 && (
                  <div className="flex justify-between text-text-secondary">
                    <dt>Delivery</dt>
                    <dd>{formatPrice(share.deliveryCharge)}</dd>
                  </div>
                )}
                {share.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <dt>Discount</dt>
                    <dd>-{formatPrice(share.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-black/5 pt-2 text-base font-semibold text-text-primary">
                  <dt>Total</dt>
                  <dd className="text-primary">{formatPrice(share.total)}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[var(--radius-card)] bg-surface p-4 shadow-md sm:p-5">
              <h2 className="text-sm font-semibold text-text-primary">
                Pay with UPI
              </h2>
              {share.paymentStatus === 'paid' ? (
                <p className="mt-3 text-sm text-success">
                  This order is already marked as paid. Thank you!
                </p>
              ) : !upiUrl ? (
                <p className="mt-3 text-sm text-text-secondary">
                  UPI is not configured yet. Please pay at the counter or to the
                  delivery partner, or contact the restaurant.
                </p>
              ) : (
                <div className="mt-4 flex flex-col items-center gap-3">
                  <img
                    src={buildUpiQrImageUrl(upiUrl, 260)}
                    alt={`UPI QR for ${formatPrice(share.total)}`}
                    className="h-56 w-56 rounded-md bg-white p-2"
                  />
                  <p className="text-sm font-medium text-text-primary">
                    {formatPrice(share.total)} · {share.upiVpa}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {share.upiPayeeName}
                  </p>
                  <a
                    href={upiUrl}
                    className="text-sm font-medium text-primary underline"
                  >
                    Open in UPI app
                  </a>
                  <p className="text-center text-xs text-text-secondary">
                    After paying, the restaurant will confirm your payment.
                  </p>
                </div>
              )}
            </section>

            <p className="text-center text-sm">
              <Link to={ROUTES.HOME} className="font-medium text-primary">
                Back to {APP_NAME}
              </Link>
            </p>
          </>
        )}
      </div>
    </Container>
  )
}
