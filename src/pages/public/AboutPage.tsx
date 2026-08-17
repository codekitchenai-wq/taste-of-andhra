import { Link } from 'react-router-dom'
import { ChefHat, Heart, MapPin, Users } from 'lucide-react'
import { WhyChooseUs } from '@/components/home/WhyChooseUs'
import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { ROUTES } from '@/constants/ROUTES'
import { useOrganization } from '@/contexts/OrganizationContext'
import { storefrontContact, storefrontWhyChooseUs } from '@/utils/storefrontCopy'

const ANDHRA_MILESTONES = [
  {
    year: '2018',
    title: 'Our Beginning',
    description:
      'Started as a small kitchen in Hyderabad serving authentic home-style Andhra meals to neighbors and friends.',
  },
  {
    year: '2021',
    title: 'Growing Community',
    description:
      'Expanded our menu and delivery reach across the city, building a loyal customer base for our biryanis and curries.',
  },
  {
    year: '2024',
    title: 'Online Ordering',
    description:
      'Launched our digital platform so customers can browse, order, and enjoy The Taste of Andhra from anywhere.',
  },
]

const SPICE_MILESTONES = [
  {
    year: 'Kitchen',
    title: 'Kerala speciality in Pune',
    description:
      'Chopsticks Spice Malabar cooks nadan curries, appam, pothichoru and Malabar biryani for Viman Nagar.',
  },
  {
    year: 'Menu',
    title: 'South, North and Indo-Chinese',
    description:
      'From Pomfret Tandoori to everyday thalis — a wide menu for families in and around Viman Nagar.',
  },
  {
    year: 'Order',
    title: 'Dine-in, takeaway and delivery',
    description:
      'Order online for pickup or delivery across nearby Pune pin codes, seven days a week.',
  },
]

export default function AboutPage() {
  const org = useOrganization()
  const contact = storefrontContact(org)
  const highlights = storefrontWhyChooseUs(org)
  const milestones =
    org.slug === 'spice-malabar' ? SPICE_MILESTONES : ANDHRA_MILESTONES

  return (
    <>
      <Container as="section" className="py-12 md:py-16 lg:py-20">
        <PageHeader title={`About ${contact.name}`} description={contact.tagline} />

        <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4 text-text-secondary">
            <p className="text-lg leading-relaxed text-text-primary">
              {contact.description}
            </p>
            <p className="leading-relaxed">
              Visit us at {contact.address}. Call {contact.phones.join(' / ')} for
              table bookings, takeaway, or delivery.
            </p>
            <p className="leading-relaxed">
              Open {contact.weekdayHours} on weekdays and {contact.weekendHours}{' '}
              on weekends.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[var(--radius-card)] bg-primary p-6 text-white shadow-md">
              <ChefHat className="h-8 w-8 text-accent" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold">
                {org.slug === 'spice-malabar' ? '500+' : '50+'}
              </p>
              <p className="text-sm text-white/85">Dishes on our menu</p>
            </div>
            <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
              <Users className="h-8 w-8 text-primary" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold text-text-primary">
                {org.slug === 'spice-malabar' ? 'Viman Nagar' : '10k+'}
              </p>
              <p className="text-sm text-text-secondary">
                {org.slug === 'spice-malabar' ? 'Pune kitchen' : 'Happy customers'}
              </p>
            </div>
            <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
              <Heart className="h-8 w-8 text-primary" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold text-text-primary">
                {org.slug === 'spice-malabar' ? '4.4' : '4.8'}
              </p>
              <p className="text-sm text-text-secondary">Average rating</p>
            </div>
            <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
              <MapPin className="h-8 w-8 text-primary" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold text-text-primary">
                {org.slug === 'spice-malabar' ? '20 min' : '45 min'}
              </p>
              <p className="text-sm text-text-secondary">Typical wait</p>
            </div>
          </div>
        </div>

        <section className="mt-16">
          <h2 className="text-2xl font-bold text-text-primary">Our Story</h2>
          <div className="mt-8 space-y-6">
            {milestones.map((item) => (
              <div
                key={item.year}
                className="flex gap-4 rounded-[var(--radius-card)] border border-black/5 bg-surface p-5 shadow-sm md:gap-6 md:p-6"
              >
                <span className="shrink-0 font-heading text-xl font-bold text-primary md:text-2xl">
                  {item.year}
                </span>
                <div>
                  <h3 className="font-semibold text-text-primary">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-[var(--radius-card)] bg-background p-6 md:p-8">
          <h2 className="text-2xl font-bold text-text-primary">Visit Us</h2>
          <a
            href={contact.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-text-secondary transition-colors hover:text-primary"
          >
            {contact.address}
          </a>
          <a
            href={contact.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark"
          >
            <MapPin className="h-4 w-4" />
            Get directions on Google Maps
          </a>
          <p className="mt-3 text-sm text-text-secondary">
            {contact.phones.join(' / ')}
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-text-primary">Weekdays</dt>
              <dd className="text-text-secondary">{contact.weekdayHours}</dd>
            </div>
            <div>
              <dt className="font-medium text-text-primary">Weekends</dt>
              <dd className="text-text-secondary">{contact.weekendHours}</dd>
            </div>
          </dl>
          <Link
            to={ROUTES.MENU}
            className="mt-6 inline-flex text-sm font-medium text-primary hover:text-primary-dark"
          >
            Explore our menu →
          </Link>
        </section>
      </Container>

      <WhyChooseUs />

      <Container as="section" className="pb-16">
        <h2 className="text-2xl font-bold text-text-primary">What Sets Us Apart</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {highlights.map((item) => (
            <li
              key={item.title}
              className="rounded-[var(--radius-card)] border border-black/5 bg-surface p-5 shadow-sm"
            >
              <h3 className="font-semibold text-text-primary">{item.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
            </li>
          ))}
        </ul>
      </Container>
    </>
  )
}
