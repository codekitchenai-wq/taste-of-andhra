import { Link } from 'react-router-dom'
import { PLATFORM_SITE } from '@/constants/PLATFORM_SITE'
import { cn } from '@/utils/cn'

type PlatformLogoVariant = 'full' | 'nav' | 'footer'

interface PlatformLogoProps {
  variant?: PlatformLogoVariant
  className?: string
  /** When false, renders img only (for use inside an existing link). */
  link?: boolean
}

const SIZE: Record<
  PlatformLogoVariant,
  { className: string; plate: boolean }
> = {
  /** Hero / light sections — full wordmark + tagline */
  full: {
    className: 'h-auto w-full max-w-[min(100%,28rem)] object-contain object-left',
    plate: true,
  },
  /** Header on dark bars — keep readable with light plate */
  nav: {
    className: 'h-9 w-auto max-w-[11.5rem] object-contain object-left sm:h-10 sm:max-w-[13.5rem]',
    plate: true,
  },
  /** Footer — compact lockup on light plate */
  footer: {
    className: 'h-12 w-auto max-w-[16rem] object-contain object-left',
    plate: true,
  },
}

export function PlatformLogo({
  variant = 'nav',
  className,
  link = true,
}: PlatformLogoProps) {
  const size = SIZE[variant]
  const img = (
    <span
      className={cn(
        'inline-flex items-center',
        size.plate &&
          'rounded-md bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-black/5',
        className,
      )}
    >
      <img
        src={PLATFORM_SITE.brand.logoSrc}
        alt={PLATFORM_SITE.brand.logoAlt}
        className={size.className}
        width={variant === 'full' ? 560 : 220}
        height={variant === 'full' ? 160 : 64}
        decoding="async"
        {...(variant === 'full' ? { loading: 'eager' as const } : { loading: 'lazy' as const })}
      />
    </span>
  )

  if (!link) return img
  return (
    <Link to="/" aria-label={PLATFORM_SITE.brand.name} className="inline-flex">
      {img}
    </Link>
  )
}
