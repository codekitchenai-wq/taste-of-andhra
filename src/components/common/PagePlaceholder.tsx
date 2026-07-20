import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Container } from '@/components/ui/Container'

interface PagePlaceholderProps {
  title: string
  description: string
  breadcrumb?: string
  breadcrumbTo?: string
}

export function PagePlaceholder({
  title,
  description,
  breadcrumb,
  breadcrumbTo = '/',
}: PagePlaceholderProps) {
  return (
    <Container as="section" className="py-12 md:py-16 lg:py-20">
      {breadcrumb && (
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link
            to={breadcrumbTo}
            className="text-sm text-text-secondary transition-colors hover:text-primary"
          >
            {breadcrumb}
          </Link>
        </nav>
      )}
      <PageHeader title={title} description={description} />
      <div className="rounded-[var(--radius-card)] border border-dashed border-gray-300 bg-surface p-8 text-center shadow-sm md:p-12">
        <p className="text-text-secondary">
          This page structure is ready. Content will be implemented in the next
          milestone.
        </p>
      </div>
    </Container>
  )
}
