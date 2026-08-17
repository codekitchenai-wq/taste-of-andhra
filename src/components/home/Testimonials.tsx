import { Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/home/SectionHeader'
import { useOrganization } from '@/contexts/OrganizationContext'
import { storefrontTestimonials } from '@/utils/storefrontCopy'

export function Testimonials() {
  const org = useOrganization()
  const items = storefrontTestimonials(org)
  return (
    <section className="bg-surface py-12 md:py-16 lg:py-20">
      <Container as="div">
        <SectionHeader
          title="What Our Customers Say"
          subtitle="Real reviews from food lovers across the city"
        />

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map((testimonial) => (
            <Card key={testimonial.id} hoverable className="flex flex-col">
              <div
                className="flex gap-1"
                aria-label={`Rating: ${testimonial.rating} out of 5`}
              >
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={`h-4 w-4 ${
                      index < Math.floor(testimonial.rating)
                        ? 'fill-accent text-accent'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-text-secondary">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <div className="mt-4 border-t border-black/5 pt-4">
                <p className="font-semibold text-text-primary">
                  {testimonial.name}
                </p>
                <p className="text-sm text-text-secondary">
                  {testimonial.location}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  )
}
