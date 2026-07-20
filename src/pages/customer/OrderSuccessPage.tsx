import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ROUTES } from '@/constants/ROUTES'

interface OrderSuccessState {
  orderId?: string
  orderNumber?: string
}

export default function OrderSuccessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as OrderSuccessState | null) ?? {}

  if (!state.orderNumber) {
    return (
      <Container as="div" className="py-16 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-3 text-text-secondary">
          We could not find your order details. Check My Orders for recent
          purchases.
        </p>
        <Button className="mt-6" onClick={() => navigate(ROUTES.ORDERS)}>
          View My Orders
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
          Thank you for your order. We have received it and will start preparing
          your food soon.
        </p>

        <p className="mt-6 rounded-[var(--radius-card)] bg-surface px-6 py-4 text-sm shadow-sm">
          Order number:{' '}
          <span className="font-semibold text-text-primary">
            {state.orderNumber}
          </span>
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {state.orderId && (
            <Button onClick={() => navigate(ROUTES.ORDER_DETAILS(state.orderId!))}>
              View Order
            </Button>
          )}
          <Button
            variant={state.orderId ? 'secondary' : 'primary'}
            onClick={() => navigate(ROUTES.ORDERS)}
          >
            View My Orders
          </Button>
          <Link to={ROUTES.MENU}>
            <Button variant="secondary" fullWidth>
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </Container>
  )
}
