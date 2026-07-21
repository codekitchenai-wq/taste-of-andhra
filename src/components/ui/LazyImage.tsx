import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/utils/cn'

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  eager?: boolean
}

export function LazyImage({
  eager = false,
  className,
  alt,
  src,
  onError,
  ...props
}: LazyImageProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
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
      src={src}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cn(className)}
      onError={(event) => {
        setFailed(true)
        onError?.(event)
      }}
      {...props}
    />
  )
}
