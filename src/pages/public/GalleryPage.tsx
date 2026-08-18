import { useEffect, useMemo, useState } from 'react'
import { Container } from '@/components/ui/Container'
import { LazyImage } from '@/components/ui/LazyImage'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingState } from '@/components/ui/LoadingState'
import { useOrganization } from '@/contexts/OrganizationContext'
import * as dishService from '@/services/dishService'
import { isAndhraLocalAsset } from '@/utils/menuImage'
import {
  SPICE_MALABAR_HERO,
  dishImageFallback,
  isSpiceMalabarStorefront,
  storefrontContact,
} from '@/utils/storefrontCopy'

export default function GalleryPage() {
  const org = useOrganization()
  const contact = storefrontContact(org)
  const [urls, setUrls] = useState<{ src: string; alt: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (org.isLoading) return

    void dishService.getDishes().then((result) => {
      if (cancelled) return
      const dishes = result.success ? result.data : []
      const photos = dishes
        .filter((dish) => dish.image_url && !isAndhraLocalAsset(dish.image_url))
        .slice(0, 18)
        .map((dish) => ({
          src: dishImageFallback(dish.image_url, org.slug),
          alt: dish.name,
        }))

      if (photos.length === 0 && org.slug && org.slug !== 'thetasteofandhra') {
        setUrls([{ src: SPICE_MALABAR_HERO, alt: `${contact.name} kitchen` }])
      } else {
        setUrls(photos)
      }
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [contact.name, org.isLoading, org.slug, org.organizationId])

  const description = useMemo(() => {
    if (isSpiceMalabarStorefront(org)) {
      return 'Dishes from our Viman Nagar kitchen — Kerala specials, tandoor, and Indo-Chinese.'
    }
    if (org.resolvedFromHost) {
      return `A look at the ${contact.name} menu.`
    }
    return 'A glimpse of our Andhra specialties, fresh ingredients, and the flavors we serve every day.'
  }, [contact.name, org.resolvedFromHost, org.slug])

  return (
    <Container as="section" className="py-12 md:py-16 lg:py-20">
      <PageHeader title="Gallery" description={description} />

      {isLoading ? (
        <LoadingState variant="grid" className="mt-10" />
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {urls.map((image) => (
            <figure
              key={image.src + image.alt}
              className="group overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-md"
            >
              <LazyImage
                src={image.src}
                alt={image.alt}
                imageWidth={640}
                className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <figcaption className="p-4 text-sm font-medium text-text-primary">
                {image.alt}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </Container>
  )
}
