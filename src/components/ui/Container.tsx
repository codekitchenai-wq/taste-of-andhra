import { cn } from '@/utils/cn'

interface ContainerProps {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'section' | 'main' | 'header' | 'footer'
}

export function Container({
  children,
  className,
  as: Component = 'div',
}: ContainerProps) {
  return (
    <Component
      className={cn(
        'mx-auto w-full max-w-[1280px] px-4 md:px-6 lg:px-8',
        className,
      )}
    >
      {children}
    </Component>
  )
}
