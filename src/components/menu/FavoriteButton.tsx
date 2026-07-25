import { Heart } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { cn } from '@/utils/cn'

interface FavoriteButtonProps {
  dishId: string
  className?: string
  size?: 'sm' | 'md'
}

export function FavoriteButton({
  dishId,
  className,
  size = 'md',
}: FavoriteButtonProps) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { isFavorite, toggle, isUpdating } = useFavorites()
  const active = isFavorite(dishId)

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (!isAuthenticated) {
      toast.error('Sign in to save favorites')
      navigate(ROUTES.LOGIN)
      return
    }

    const result = await toggle(dishId)
    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(
      result.data.isFavorite ? 'Added to favorites' : 'Removed from favorites',
    )
  }

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'

  return (
    <button
      type="button"
      onClick={(e) => void handleClick(e)}
      disabled={isUpdating}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-surface/90 text-text-secondary shadow-sm backdrop-blur transition-colors hover:text-error',
        buttonSize,
        active && 'text-error',
        className,
      )}
    >
      <Heart
        className={cn(iconSize, active && 'fill-error')}
        aria-hidden="true"
      />
    </button>
  )
}
