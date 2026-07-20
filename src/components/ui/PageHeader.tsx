interface PageHeaderProps {
  title: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-8 md:mb-12">
      <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
      {description && (
        <p className="mt-3 max-w-2xl text-base text-text-secondary md:text-lg">
          {description}
        </p>
      )}
    </header>
  )
}
