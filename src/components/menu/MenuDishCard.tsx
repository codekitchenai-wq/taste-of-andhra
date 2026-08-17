import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clock, Flame, Minus, Plus, ShoppingCart, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FavoriteButton } from '@/components/menu/FavoriteButton'
import { SPICE_LEVEL } from '@/constants/SPICE_LEVEL'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import type { Dish } from '@/types/Dish'
import { LazyImage } from '@/components/ui/LazyImage'
import { useOrganization } from '@/contexts/OrganizationContext'
import { dishImageFallback } from '@/utils/storefrontCopy'
import { formatPrice } from '@/utils/format'
import { cn } from '@/utils/cn'

interface MenuDishCardProps {
  dish: Dish
  categoryName?: string
  fallbackImage?: string | null
}

const DESC_COLLAPSE_LEN = 72

export function MenuDishCard({
  dish,
  categoryName,
  fallbackImage,
}: MenuDishCardProps) {
  const org = useOrganization()
  const imageSrc = dishImageFallback(
    dish.image_url || fallbackImage || null,
    org.slug,
  )
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { addItem, isUpdating } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [descExpanded, setDescExpanded] = useState(false)

  const description = dish.description?.trim() ?? ''
  const canExpandDesc = description.length > DESC_COLLAPSE_LEN

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to add items to your cart')
      navigate(ROUTES.LOGIN, { state: { from: ROUTES.MENU } })
      return
    }

    const result = await addItem(dish.id, quantity)

    if (result.success) {
      toast.success(
        quantity > 1
          ? `${quantity}× ${dish.name} added to cart`
          : `${dish.name} added to cart`,
      )
      setQuantity(1)
      return
    }

    if (result.message.toLowerCase().includes('select at least')) {
      toast.error('Customize this dish before adding it')
      navigate(ROUTES.DISH_DETAILS(dish.slug))
      return
    }

    toast.error(result.message)
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-black/5 bg-surface shadow-sm transition-shadow hover:shadow-md">
      <Link to={ROUTES.DISH_DETAILS(dish.slug)} className="block">
        {/* ~160–180px image height reads well for food grids at 5-up */}
        <div className="relative aspect-[4/3] overflow-hidden bg-background sm:aspect-[5/4]">
          <LazyImage
            src={imageSrc}
            alt={dish.name}
            imageWidth={360}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            <Badge variant={dish.is_veg ? 'veg' : 'nonVeg'} className="text-[10px]">
              {dish.is_veg ? 'Veg' : 'Non-Veg'}
            </Badge>
            {dish.is_featured && (
              <Badge variant="featured" className="text-[10px]">
                Featured
              </Badge>
            )}
          </div>
          <FavoriteButton
            dishId={dish.id}
            className="absolute right-2 top-2"
            size="sm"
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3">
        {categoryName && (
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-primary">
            {categoryName}
          </p>
        )}

        <div className="flex items-start justify-between gap-1.5">
          <Link to={ROUTES.DISH_DETAILS(dish.slug)} className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary transition-colors group-hover:text-primary">
              {dish.name}
            </h3>
          </Link>
          <span className="shrink-0 text-sm font-bold text-primary">
            {formatPrice(dish.price)}
          </span>
        </div>

        {description ? (
          <div>
            <p
              className={cn(
                'text-xs leading-snug text-text-secondary',
                !descExpanded && 'line-clamp-2',
              )}
            >
              {description}
            </p>
            {canExpandDesc && (
              <button
                type="button"
                onClick={() => setDescExpanded((open) => !open)}
                className="mt-0.5 text-[11px] font-medium text-primary hover:underline"
              >
                {descExpanded ? 'Show less' : 'More'}
              </button>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-text-secondary">
          {dish.rating != null && (
            <span className="inline-flex items-center gap-0.5">
              <Star
                className="h-3 w-3 fill-accent text-accent"
                aria-hidden="true"
              />
              {dish.rating.toFixed(1)}
            </span>
          )}
          {dish.preparation_time != null && (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {dish.preparation_time}m
            </span>
          )}
          {dish.spice_level && (
            <span className="inline-flex items-center gap-0.5">
              <Flame className="h-3 w-3 text-error" aria-hidden="true" />
              {SPICE_LEVEL[dish.spice_level]}
            </span>
          )}
        </div>

        <div className="mt-auto space-y-1.5 pt-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-text-secondary">
              Qty
            </span>
            <div className="inline-flex items-center rounded-[var(--radius-button)] border border-black/10">
              <button
                type="button"
                disabled={quantity <= 1 || isUpdating}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-8 w-8 items-center justify-center text-text-secondary transition-colors hover:bg-black/5 disabled:opacity-40"
                aria-label={`Decrease quantity of ${dish.name}`}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-7 text-center text-sm font-semibold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                disabled={isUpdating || quantity >= 20}
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="flex h-8 w-8 items-center justify-center text-text-secondary transition-colors hover:bg-black/5 disabled:opacity-40"
                aria-label={`Increase quantity of ${dish.name}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-1.5">
            <Button
              type="button"
              size="sm"
              className="min-h-8"
              disabled={isUpdating}
              onClick={() => void handleAddToCart()}
            >
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="min-h-8 px-2.5"
              onClick={() => navigate(ROUTES.CART)}
              aria-label="Go to cart"
              title="Go to cart"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
