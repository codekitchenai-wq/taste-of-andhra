import { Link, useNavigate } from 'react-router-dom'
import { Clock, Flame, Star } from 'lucide-react'
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
import { formatPrice } from '@/utils/format'

interface MenuDishCardProps {
  dish: Dish
  categoryName?: string
}

export function MenuDishCard({ dish, categoryName }: MenuDishCardProps) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { addItem, isUpdating } = useCart()

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to add items to your cart')
      navigate(ROUTES.LOGIN, { state: { from: ROUTES.MENU } })
      return
    }

    const result = await addItem(dish.id)

    if (result.success) {
      toast.success(`${dish.name} added to cart`)
      return
    }

    toast.error(result.message)
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={ROUTES.DISH_DETAILS(dish.slug)} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-background">
          <LazyImage
            src={dish.image_url ?? undefined}
            alt={dish.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge variant={dish.is_veg ? 'veg' : 'nonVeg'}>
              {dish.is_veg ? 'Veg' : 'Non-Veg'}
            </Badge>
            {dish.is_featured && <Badge variant="featured">Featured</Badge>}
          </div>
          <FavoriteButton
            dishId={dish.id}
            className="absolute right-3 top-3"
            size="sm"
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {categoryName && (
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {categoryName}
          </p>
        )}

        <div className="mt-1 flex items-start justify-between gap-2">
          <Link to={ROUTES.DISH_DETAILS(dish.slug)}>
            <h3 className="font-semibold text-text-primary transition-colors group-hover:text-primary">
              {dish.name}
            </h3>
          </Link>
          <span className="shrink-0 font-semibold text-primary">
            {formatPrice(dish.price)}
          </span>
        </div>

        {dish.description && (
          <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
            {dish.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
          {dish.rating != null && (
            <span className="inline-flex items-center gap-1">
              <Star
                className="h-4 w-4 fill-accent text-accent"
                aria-hidden="true"
              />
              {dish.rating.toFixed(1)}
            </span>
          )}
          {dish.preparation_time != null && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {dish.preparation_time} min
            </span>
          )}
          {dish.spice_level && (
            <span className="inline-flex items-center gap-1">
              <Flame className="h-4 w-4 text-error" aria-hidden="true" />
              {SPICE_LEVEL[dish.spice_level]}
            </span>
          )}
        </div>

        <div className="mt-auto pt-4">
          <Button
            type="button"
            fullWidth
            disabled={isUpdating}
            onClick={() => void handleAddToCart()}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </article>
  )
}
