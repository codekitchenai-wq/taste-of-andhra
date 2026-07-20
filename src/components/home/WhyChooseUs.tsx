import { ChefHat, Clock, Leaf, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/home/SectionHeader'
import { whyChooseUsItems } from '@/data/home'

const icons: LucideIcon[] = [ChefHat, Leaf, Clock, ShieldCheck]

export function WhyChooseUs() {
  return (
    <section className="bg-background py-12 md:py-16 lg:py-20">
      <Container as="div">
        <SectionHeader
          title="Why Choose Us"
          subtitle="What makes Taste of Andhra your go-to destination for authentic food"
        />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {whyChooseUsItems.map((item, index) => {
            const Icon = icons[index] ?? ChefHat

            return (
              <Card key={item.title} hoverable className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {item.description}
                </p>
              </Card>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
