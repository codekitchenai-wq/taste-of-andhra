import { useParams } from 'react-router-dom'
import { PagePlaceholder } from '@/components/common/PagePlaceholder'
import { ROUTES } from '@/constants/ROUTES'

export default function DishDetailsPage() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <PagePlaceholder
      title="Dish Details"
      description={`Full dish information for "${slug ?? 'dish'}".`}
      breadcrumb="Back to Menu"
      breadcrumbTo={ROUTES.MENU}
    />
  )
}
