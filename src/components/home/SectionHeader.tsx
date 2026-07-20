interface SectionHeaderProps {
  title: string
  subtitle?: string
  align?: 'left' | 'center'
}

export function SectionHeader({
  title,
  subtitle,
  align = 'center',
}: SectionHeaderProps) {
  return (
    <div
      className={
        align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'
      }
    >
      <h2 className="font-heading text-3xl font-bold md:text-4xl">{title}</h2>
      {subtitle && (
        <p className="mt-3 text-base text-text-secondary md:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  )
}
