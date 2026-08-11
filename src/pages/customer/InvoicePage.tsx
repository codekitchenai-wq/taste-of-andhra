import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { APP_NAME } from '@/constants/APP'
import { ROUTES } from '@/constants/ROUTES'
import * as gstInvoiceService from '@/services/gstInvoiceService'
import type { InvoiceViewModel } from '@/services/gstInvoiceService'
import * as orderService from '@/services/orderService'
import { formatBranchAddress } from '@/utils/mapBranch'
import { formatDateTimeFull, formatPrice } from '@/utils/format'

export default function InvoicePage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [invoiceView, setInvoiceView] = useState<InvoiceViewModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!orderId) {
      setError('Order not found.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const orderResult = await orderService.getOrderDetails(orderId)

    if (!orderResult.success) {
      setError(orderResult.message)
      setInvoiceView(null)
      setIsLoading(false)
      return
    }

    const invoiceResult = await gstInvoiceService.getInvoiceView(
      orderId,
      orderResult.data,
    )

    if (invoiceResult.success) {
      setInvoiceView(invoiceResult.data)
    } else {
      setError(invoiceResult.message)
      setInvoiceView(null)
    }

    setIsLoading(false)
  }, [orderId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const handlePrint = () => {
    window.print()
  }

  return (
    <Container as="div" className="py-8 md:py-12 print:py-4">
      <div className="mb-8 print:hidden">
        <Link
          to={orderId ? ROUTES.ORDER_DETAILS(orderId) : ROUTES.ORDERS}
          className="text-sm font-medium text-primary transition-colors hover:text-primary-dark"
        >
          ← Back to Order Details
        </Link>
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && invoiceView && (
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <h1 className="text-2xl font-bold">GST Invoice</h1>
            <Button type="button" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print Invoice
            </Button>
          </div>

          <article className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md print:rounded-none print:shadow-none md:p-8">
            <header className="border-b border-black/10 pb-6">
              <h2 className="font-heading text-2xl font-bold text-primary">
                {APP_NAME}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {formatBranchAddress(invoiceView.branch)}
              </p>
              {invoiceView.branch.gstin && (
                <p className="mt-2 text-sm font-medium text-text-primary">
                  GSTIN: {invoiceView.branch.gstin}
                </p>
              )}
            </header>

            <div className="mt-6 grid gap-4 border-b border-black/10 pb-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Invoice Number
                </p>
                <p className="mt-1 font-semibold text-text-primary">
                  {invoiceView.invoice.invoice_number}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Order Number
                </p>
                <p className="mt-1 font-semibold text-text-primary">
                  <OrderNumberDisplay value={invoiceView.order.order_number} />
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Issued On
                </p>
                <p className="mt-1 text-text-primary">
                  {formatDateTimeFull(invoiceView.invoice.issued_at)}
                </p>
              </div>
            </div>

            <table className="mt-6 w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left">
                  <th className="pb-3 font-semibold text-text-primary">Item</th>
                  <th className="pb-3 text-center font-semibold text-text-primary">
                    Qty
                  </th>
                  <th className="pb-3 text-right font-semibold text-text-primary">
                    Price
                  </th>
                  <th className="pb-3 text-right font-semibold text-text-primary">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoiceView.order.items.map((item) => (
                  <tr key={item.id} className="border-b border-black/5">
                    <td className="py-3 text-text-primary">
                      <div>
                        {item.dish_name_snapshot ?? item.dish?.name ?? 'Dish'}
                      </div>
                      {item.modifiers_snapshot.length > 0 && (
                        <div className="mt-1 text-xs text-text-secondary">
                          {item.modifiers_snapshot
                            .map((mod) => mod.modifier_name)
                            .join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-center text-text-secondary">
                      {item.quantity}
                    </td>
                    <td className="py-3 text-right text-text-secondary">
                      {formatPrice(item.price)}
                    </td>
                    <td className="py-3 text-right font-medium text-text-primary">
                      {formatPrice(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="mt-6 space-y-2 border-t border-black/10 pt-6 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Taxable Amount</dt>
                <dd className="font-medium text-text-primary">
                  {formatPrice(invoiceView.invoice.taxable_amount)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">CGST</dt>
                <dd className="font-medium text-text-primary">
                  {formatPrice(invoiceView.invoice.cgst)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">SGST</dt>
                <dd className="font-medium text-text-primary">
                  {formatPrice(invoiceView.invoice.sgst)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Delivery Charge</dt>
                <dd className="font-medium text-text-primary">
                  {formatPrice(invoiceView.order.delivery_charge)}
                </dd>
              </div>
              {invoiceView.order.discount > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Discount</dt>
                  <dd className="font-medium text-error">
                    −{formatPrice(invoiceView.order.discount)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-black/10 pt-3 text-base">
                <dt className="font-semibold text-text-primary">Total</dt>
                <dd className="font-bold text-primary">
                  {formatPrice(invoiceView.invoice.total)}
                </dd>
              </div>
            </dl>

            <p className="mt-8 text-center text-xs text-text-secondary">
              This is a computer-generated GST invoice and does not require a
              signature.
            </p>
          </article>
        </div>
      )}
    </Container>
  )
}
