import { useMemo, useState } from 'react'
import { Container } from '@/components/ui/Container'
import { LazyImage } from '@/components/ui/LazyImage'
import { PageHeader } from '@/components/ui/PageHeader'
import { galleryImages, type GalleryImage } from '@/data/gallery'
import { cn } from '@/utils/cn'

type GalleryFilter = 'all' | GalleryImage['category']

const FILTERS: { id: GalleryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'dishes', label: 'Dishes' },
  { id: 'categories', label: 'Categories' },
  { id: 'hero', label: 'Restaurant' },
]

export default function GalleryPage() {
  const [filter, setFilter] = useState<GalleryFilter>('all')

  const filteredImages = useMemo(() => {
    if (filter === 'all') return galleryImages
    return galleryImages.filter((image) => image.category === filter)
  }, [filter])

  return (
    <Container as="section" className="py-12 md:py-16 lg:py-20">
      <PageHeader
        title="Gallery"
        description="A glimpse of our Andhra specialties, fresh ingredients, and the flavors we serve every day."
      />

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              filter === item.id
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:bg-primary/10 hover:text-primary',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredImages.map((image) => (
          <figure
            key={image.id}
            className="group overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-md"
          >
            <LazyImage
              src={image.src}
              alt={image.alt}
              className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <figcaption className="p-4 text-sm font-medium text-text-primary">
              {image.alt}
            </figcaption>
          </figure>
        ))}
      </div>
    </Container>
  )
}
