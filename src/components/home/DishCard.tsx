import { Link, useNavigate } from 'react-router-dom'
import { Clock, Star } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LazyImage } from '@/components/ui/LazyImage'
import type { HomeDish } from '@/data/home'
import { ROUTES } from '@/constants/ROUTES'
import { formatPrice } from '@/utils/format'

interface DishCardProps {
  dish: HomeDish
}

export function DishCard({ dish }: DishCardProps) {
  const navigate = useNavigate()

  return (
    <article className="group overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={ROUTES.DISH_DETAILS(dish.slug)} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          <LazyImage
            src={dish.imageUrl}
            alt={dish.name}
            imageWidth={480}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3">
            <Badge variant={dish.isVeg ? 'veg' : 'nonVeg'}>
              {dish.isVeg ? 'Veg' : 'Non-Veg'}
            </Badge>
          </div>
        </div>
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <Link to={ROUTES.DISH_DETAILS(dish.slug)}>
            <h3 className="font-semibold text-text-primary transition-colors group-hover:text-primary">
              {dish.name}
            </h3>
          </Link>
          <span className="shrink-0 font-semibold text-primary">
            {formatPrice(dish.price)}
          </span>
        </div>

        <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
          {dish.description}
        </p>

        <div className="mt-3 flex items-center gap-4 text-sm text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <Star
              className="h-4 w-4 fill-accent text-accent"
              aria-hidden="true"
            />
            {dish.rating.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {dish.prepTime} min
          </span>
        </div>

        <Button
          type="button"
          fullWidth
          className="mt-4"
          onClick={() => navigate(ROUTES.MENU)}
        >
          View on Menu
        </Button>
      </div>
    </article>
  )
}
