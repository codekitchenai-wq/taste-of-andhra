import { useNavigate } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import type { Dish } from '@/types/Dish'
import { formatPrice } from '@/utils/format'
import { cn } from '@/utils/cn'

interface LightMenuRowProps {
  dish: Dish
}

export function LightMenuRow({ dish }: LightMenuRowProps) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { cart, addItem, updateQuantity, removeItem, isUpdating } = useCart()

  const cartItem = cart?.items.find((item) => item.dish_id === dish.id)
  const quantity = cartItem?.quantity ?? 0

  const requireAuth = () => {
    toast.error('Please sign in to add items to your cart')
    navigate(ROUTES.LOGIN, { state: { from: ROUTES.LIGHT_MENU } })
  }

  const handleAdd = async () => {
    if (!isAuthenticated) {
      requireAuth()
      return
    }

    const result = await addItem(dish.id)

    if (result.success) {
      toast.success(`${dish.name} added`)
      return
    }

    toast.error(result.message)
  }

  const handleIncrease = async () => {
    if (!cartItem) {
      await handleAdd()
      return
    }

    const result = await updateQuantity(cartItem.id, cartItem.quantity + 1)

    if (!result.success) {
      toast.error(result.message)
    }
  }

  const handleDecrease = async () => {
    if (!cartItem) return

    if (cartItem.quantity <= 1) {
      const result = await removeItem(cartItem.id)

      if (result.success) {
        toast.success(`${dish.name} removed`)
        return
      }

      toast.error(result.message)
      return
    }

    const result = await updateQuantity(cartItem.id, cartItem.quantity - 1)

    if (!result.success) {
      toast.error(result.message)
    }
  }

  return (
    <article
      className={cn(
        'flex items-center gap-3 border-b border-black/5 py-3 last:border-b-0',
        !dish.is_available && 'opacity-55',
      )}
    >
      <span
        className={cn(
          'mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border-2',
          dish.is_veg ? 'border-success' : 'border-error',
        )}
        aria-label={dish.is_veg ? 'Vegetarian' : 'Non-vegetarian'}
        title={dish.is_veg ? 'Veg' : 'Non-Veg'}
      >
        <span
          className={cn(
            'mx-auto mt-0.5 block h-1.5 w-1.5 rounded-full',
            dish.is_veg ? 'bg-success' : 'bg-error',
          )}
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate font-medium text-text-primary">{dish.name}</h3>
          <p className="shrink-0 font-semibold text-primary">
            {formatPrice(dish.price)}
          </p>
        </div>
        {dish.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">
            {dish.description}
          </p>
        )}
      </div>

      {dish.is_available ? (
        quantity > 0 ? (
          <div className="flex shrink-0 items-center gap-1 rounded-[var(--radius-button)] border border-primary/20 bg-primary/5 p-0.5">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => void handleDecrease()}
              className="flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
              aria-label={`Decrease ${dish.name}`}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-6 text-center text-sm font-semibold text-text-primary">
              {quantity}
            </span>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => void handleIncrease()}
              className="flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
              aria-label={`Increase ${dish.name}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => void handleAdd()}
            className="flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-button)] bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            aria-label={`Add ${dish.name} to cart`}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )
      ) : (
        <span className="shrink-0 text-xs font-medium text-text-secondary">
          Unavailable
        </span>
      )}
    </article>
  )
}
