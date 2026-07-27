import { Container } from '@/components/ui/Container'
import { DishCard } from '@/components/home/DishCard'
import { SectionHeader } from '@/components/home/SectionHeader'
import type { HomeDish } from '@/data/home'

interface FeaturedDishesProps {
  dishes: HomeDish[]
}

export function FeaturedDishes({ dishes }: FeaturedDishesProps) {
  if (dishes.length === 0) return null

  return (
    <section className="bg-surface py-12 md:py-16 lg:py-20">
      <Container as="div">
        <SectionHeader
          title="Featured Dishes"
          subtitle="Customer favorites handpicked from our kitchen"
        />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      </Container>
    </section>
  )
}
