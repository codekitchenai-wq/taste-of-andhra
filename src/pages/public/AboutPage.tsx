import { Link } from 'react-router-dom'
import { ChefHat, Heart, MapPin, Users } from 'lucide-react'
import { WhyChooseUs } from '@/components/home/WhyChooseUs'
import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { APP_NAME, APP_TAGLINE, CONTACT, OPENING_HOURS } from '@/constants/APP'
import { ROUTES } from '@/constants/ROUTES'
import { whyChooseUsItems } from '@/data/home'

const milestones = [
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

export default function AboutPage() {
  return (
    <>
      <Container as="section" className="py-12 md:py-16 lg:py-20">
        <PageHeader
          title={`About ${APP_NAME}`}
          description={APP_TAGLINE}
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4 text-text-secondary">
            <p className="text-lg leading-relaxed text-text-primary">
              {APP_NAME} brings the bold, authentic flavors of Andhra Pradesh to
              your table — from fiery Gongura curries to fragrant Dum Biryanis
              prepared with traditional recipes and fresh ingredients.
            </p>
            <p className="leading-relaxed">
              Our chefs combine generations of culinary heritage with modern
              hygiene standards. Every dish is cooked to order, packed with care,
              and delivered hot so you experience restaurant-quality Andhra
              cuisine at home.
            </p>
            <p className="leading-relaxed">
              Whether you are craving a quick lunch, a family dinner, or catering
              for a party, we are here to serve food that tastes like home.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[var(--radius-card)] bg-primary p-6 text-white shadow-md">
              <ChefHat className="h-8 w-8 text-accent" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold">50+</p>
              <p className="text-sm text-white/85">Dishes on our menu</p>
            </div>
            <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
              <Users className="h-8 w-8 text-primary" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold text-text-primary">10k+</p>
              <p className="text-sm text-text-secondary">Happy customers</p>
            </div>
            <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
              <Heart className="h-8 w-8 text-primary" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold text-text-primary">4.8</p>
              <p className="text-sm text-text-secondary">Average rating</p>
            </div>
            <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
              <MapPin className="h-8 w-8 text-primary" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold text-text-primary">45 min</p>
              <p className="text-sm text-text-secondary">Average delivery</p>
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
            href={CONTACT.mapsDirectionsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-text-secondary transition-colors hover:text-primary"
          >
            {CONTACT.address}
          </a>
          <a
            href={CONTACT.mapsDirectionsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark"
          >
            <MapPin className="h-4 w-4" />
            Get directions on Google Maps
          </a>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-text-primary">Weekdays</dt>
              <dd className="text-text-secondary">{OPENING_HOURS.weekdays}</dd>
            </div>
            <div>
              <dt className="font-medium text-text-primary">Weekends</dt>
              <dd className="text-text-secondary">{OPENING_HOURS.weekends}</dd>
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
          {whyChooseUsItems.map((item) => (
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
