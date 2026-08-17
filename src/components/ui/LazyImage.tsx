import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/utils/cn'
import { optimizeMenuImage } from '@/utils/menuImage'

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  eager?: boolean
  /** Target width sent to the image CDN (Swiggy/Cloudinary). */
  imageWidth?: number
}

export function LazyImage({
  eager = false,
  imageWidth,
  className,
  alt,
  src,
  onError,
  ...props
}: LazyImageProps) {
  const [failed, setFailed] = useState(false)
  const optimized = optimizeMenuImage(
    typeof src === 'string' ? src : null,
    imageWidth ?? (eager ? 1200 : 400),
  )

  useEffect(() => {
    setFailed(false)
  }, [optimized])

  if (!optimized || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-primary/10 text-primary',
          className,
        )}
        role="img"
        aria-label={alt || 'Image unavailable'}
      >
        <ImageOff className="h-8 w-8 opacity-60" aria-hidden="true" />
      </div>
    )
  }

  return (
    <img
      alt={alt ?? ''}
      src={optimized}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : 'low'}
      referrerPolicy="no-referrer"
      sizes={
        eager
          ? '100vw'
          : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw'
      }
      className={cn(className)}
      onError={(event) => {
        setFailed(true)
        onError?.(event)
      }}
      {...props}
    />
  )
}
