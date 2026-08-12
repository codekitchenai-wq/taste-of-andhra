import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { ROUTES } from '@/constants/ROUTES'
import type { CartItem } from '@/types/Cart'
import { LazyImage } from '@/components/ui/LazyImage'
import { formatPrice } from '@/utils/format'

interface CartItemRowProps {
  item: CartItem
  isUpdating: boolean
  onUpdateQuantity: (cartItemId: string, quantity: number) => void
  onRemove: (cartItemId: string) => void
}

export function CartItemRow({
  item,
  isUpdating,
  onUpdateQuantity,
  onRemove,
}: CartItemRowProps) {
  const dish = item.dish

  if (!dish) return null

  const lineTotal = item.unit_price * item.quantity
  const modifierLabels = item.modifiers_snapshot
    .map((mod) => mod.modifier_name)
    .filter(Boolean)

  return (
    <article className="flex min-w-0 gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-sm sm:items-center sm:p-5">
      <Link
        to={ROUTES.DISH_DETAILS(dish.slug)}
        className="shrink-0 overflow-hidden rounded-[var(--radius-input)]"
      >
        {dish.image_url ? (
          <LazyImage
            src={dish.image_url}
            alt={dish.name}
            className="h-20 w-20 object-cover sm:h-24 sm:w-24"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center bg-primary/10 text-xl font-bold text-primary sm:h-24 sm:w-24">
            {dish.name.charAt(0)}
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={ROUTES.DISH_DETAILS(dish.slug)}>
              <h3 className="font-semibold text-text-primary transition-colors hover:text-primary">
                {dish.name}
              </h3>
            </Link>
            <Badge variant={dish.is_veg ? 'veg' : 'nonVeg'}>
              {dish.is_veg ? 'Veg' : 'Non-Veg'}
            </Badge>
          </div>
          {modifierLabels.length > 0 && (
            <p className="mt-1 text-xs text-text-secondary">
              {modifierLabels.join(' · ')}
            </p>
          )}
          <p className="mt-1 text-sm text-text-secondary">
            {formatPrice(item.unit_price)} each
          </p>
          <p className="mt-2 font-semibold text-primary sm:hidden">
            {formatPrice(lineTotal)}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="inline-flex items-center rounded-[var(--radius-button)] border border-gray-200">
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
              disabled={isUpdating}
              className="flex h-10 w-10 items-center justify-center text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
              aria-label={`Decrease quantity of ${dish.name}`}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-10 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              disabled={isUpdating}
              className="flex h-10 w-10 items-center justify-center text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
              aria-label={`Increase quantity of ${dish.name}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <p className="hidden min-w-[80px] text-right font-semibold text-primary sm:block">
            {formatPrice(lineTotal)}
          </p>

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={isUpdating}
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
            aria-label={`Remove ${dish.name} from cart`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  )
}
