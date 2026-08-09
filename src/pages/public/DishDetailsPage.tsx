import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Clock,
  Flame,
  Leaf,
  ShoppingCart,
  Star,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { DishReviews } from '@/components/dish/DishReviews'
import { FavoriteButton } from '@/components/menu/FavoriteButton'
import { DishModifierPicker } from '@/components/menu/DishModifierPicker'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ErrorState } from '@/components/ui/ErrorState'
import { LazyImage } from '@/components/ui/LazyImage'
import { LoadingState } from '@/components/ui/LoadingState'
import { SPICE_LEVEL } from '@/constants/SPICE_LEVEL'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useDishBySlug } from '@/hooks/useDishBySlug'
import * as modifierService from '@/services/modifierService'
import type { DishModifierGroup } from '@/types/Modifier'
import { formatPrice } from '@/utils/format'
import {
  buildModifierSnapshots,
  calculateUnitPrice,
} from '@/utils/modifiers'

const LightMenuPage = lazy(() => import('@/pages/public/LightMenuPage'))

/** Reserved under `/menu/:slug` so they never resolve as dishes. */
const RESERVED_MENU_SLUGS = new Set(['light'])

export default function DishDetailsPage() {
  const { slug } = useParams<{ slug: string }>()
  const isReserved = Boolean(slug && RESERVED_MENU_SLUGS.has(slug))
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { addItem, isUpdating } = useCart()
  const { dish, category, isLoading, error, refetch } = useDishBySlug(
    !isReserved && slug ? slug : undefined,
  )
  const [groups, setGroups] = useState<DishModifierGroup[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!dish?.id) {
      setGroups([])
      setSelectedIds([])
      return
    }

    let cancelled = false

    void (async () => {
      const result = await modifierService.getDishModifierGroups(dish.id)
      if (cancelled) return

      if (result.success) {
        setGroups(result.data)
        setSelectedIds([])
      } else {
        setGroups([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dish?.id])

  const previewUnitPrice = useMemo(() => {
    if (!dish) return 0
    const built = buildModifierSnapshots(groups, selectedIds)
    if (!built.ok) return dish.price
    return calculateUnitPrice(dish.price, built.snapshots)
  }, [dish, groups, selectedIds])

  if (isReserved) {
    return (
      <Suspense fallback={<LoadingState />}>
        <LightMenuPage />
      </Suspense>
    )
  }

  const handleAddToCart = async () => {
    if (!dish) return

    if (!isAuthenticated) {
      toast.error('Please sign in to add items to your cart')
      navigate(ROUTES.LOGIN, {
        state: { from: ROUTES.DISH_DETAILS(slug ?? '') },
      })
      return
    }

    const result = await addItem(dish.id, 1, selectedIds)

    if (result.success) {
      toast.success(`${dish.name} added to cart`)
      return
    }

    toast.error(result.message)
  }

  if (isLoading) {
    return (
      <Container as="div" className="py-8 md:py-12">
        <LoadingState variant="inline" />
      </Container>
    )
  }

  if (error || !dish) {
    return (
      <Container as="div" className="py-8 md:py-12">
        <ErrorState
          message={error ?? 'Dish not found.'}
          onRetry={() => void refetch()}
        />
        <Link
          to={ROUTES.MENU}
          className="mt-6 inline-flex text-sm font-medium text-primary hover:text-primary-dark"
        >
          Back to Menu
        </Link>
      </Container>
    )
  }

  return (
    <Container as="div" className="py-8 md:py-12">
      <nav aria-label="Breadcrumb" className="mb-6">
        <Link
          to={ROUTES.MENU}
          className="text-sm text-text-secondary transition-colors hover:text-primary"
        >
          Back to Menu
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-md">
          <LazyImage
            src={dish.image_url ?? undefined}
            alt={dish.name}
            className="aspect-[4/3] w-full object-cover"
          />
          <FavoriteButton dishId={dish.id} className="absolute right-3 top-3" />
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={dish.is_veg ? 'veg' : 'nonVeg'}>
                {dish.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
              </Badge>
              {category && (
                <Badge variant="default">{category.name}</Badge>
              )}
              {dish.is_featured && (
                <Badge variant="featured">Featured</Badge>
              )}
            </div>

            <h1 className="mt-4 font-heading text-3xl font-bold text-text-primary md:text-4xl">
              {dish.name}
            </h1>

            {dish.description && (
              <p className="mt-3 text-text-secondary">{dish.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
            {dish.rating != null && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-accent text-accent" />
                {dish.rating.toFixed(1)}
              </span>
            )}
            {dish.preparation_time != null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {dish.preparation_time} min
              </span>
            )}
            {dish.spice_level && (
              <span className="inline-flex items-center gap-1">
                <Flame className="h-4 w-4 text-primary" />
                {SPICE_LEVEL[dish.spice_level]}
              </span>
            )}
            {dish.calories != null && (
              <span className="inline-flex items-center gap-1">
                <Leaf className="h-4 w-4" />
                {dish.calories} kcal
              </span>
            )}
          </div>

          <DishModifierPicker
            groups={groups}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
          />

          <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-background p-5">
            <div>
              <p className="text-sm text-text-secondary">Price</p>
              <p className="text-2xl font-bold text-primary">
                {formatPrice(previewUnitPrice)}
              </p>
              {previewUnitPrice !== dish.price && (
                <p className="text-xs text-text-secondary">
                  Base {formatPrice(dish.price)}
                </p>
              )}
            </div>
            <Button
              type="button"
              size="lg"
              disabled={!dish.is_available || isUpdating}
              onClick={() => void handleAddToCart()}
            >
              <ShoppingCart className="h-5 w-5" />
              {dish.is_available ? 'Add to Cart' : 'Unavailable'}
            </Button>
          </div>

          {dish.ingredients && (
            <div>
              <h2 className="font-semibold text-text-primary">Ingredients</h2>
              <p className="mt-2 text-sm text-text-secondary">
                {dish.ingredients}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 border-t border-black/5 pt-12">
        <DishReviews dishId={dish.id} />
      </div>
    </Container>
  )
}
