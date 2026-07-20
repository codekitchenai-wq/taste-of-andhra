import { cn } from '@/utils/cn'

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  eager?: boolean
}

export function LazyImage({
  eager = false,
  className,
  alt,
  ...props
}: LazyImageProps) {
  return (
    <img
      alt={alt ?? ''}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cn(className)}
      {...props}
    />
  )
}
