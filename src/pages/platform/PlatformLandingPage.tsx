import { Link } from 'react-router-dom'
import { PlatformLogo } from '@/components/platform/PlatformLogo'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { PLATFORM_SITE } from '@/constants/PLATFORM_SITE'
import { ROUTES } from '@/constants/ROUTES'

export default function PlatformLandingPage() {
  const { hero, mission, audiences, capabilities, nation, plans, liveDemo } =
    PLATFORM_SITE

  return (
    <div>
      <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-[var(--platform-ink)] md:items-center">
        <img
          src="/images/hero/hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--platform-ink)] via-[var(--platform-ink)]/90 to-[var(--platform-ink)]/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(42,157,143,0.22),transparent_55%)]" />

        <Container className="relative z-10 w-full pb-16 pt-28 md:pb-24 md:pt-32">
          <PlatformLogo variant="full" link={false} />
          <h1 className="mt-8 max-w-2xl text-2xl font-medium leading-snug text-white/95 md:text-3xl lg:text-4xl">
            {hero.headline}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
            {hero.supporting}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to={hero.primaryCta.href}>
              <Button
                size="lg"
                className="w-full bg-[var(--platform-accent)] text-white hover:bg-[var(--platform-accent-hot)] sm:w-auto"
              >
                {hero.primaryCta.label}
              </Button>
            </Link>
            <a href={hero.secondaryCta.href} target="_blank" rel="noreferrer">
              <Button
                size="lg"
                variant="ghost"
                className="w-full border border-white/30 text-white hover:bg-white/10 sm:w-auto"
              >
                {hero.secondaryCta.label}
              </Button>
            </a>
          </div>
        </Container>
      </section>

      <section className="bg-[var(--platform-bg)] py-16 md:py-24">
        <Container>
          <h2 className="platform-display text-3xl font-semibold text-[var(--platform-ink)] md:text-4xl">
            {mission.title}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--platform-muted)] md:text-lg">
            {mission.body}
          </p>
        </Container>
      </section>

      <section className="border-y border-[var(--platform-ink)]/8 bg-white py-16 md:py-24">
        <Container>
          <h2 className="platform-display text-3xl font-semibold text-[var(--platform-ink)] md:text-4xl">
            Who we serve
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--platform-muted)]">
            Start with food service — built to extend as other SMEs digitize.
          </p>
          <ul className="mt-10 grid gap-10 md:grid-cols-3">
            {audiences.map((item) => (
              <li key={item.id}>
                <h3 className="text-lg font-semibold text-[var(--platform-ink)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--platform-muted)]">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section
        id="capabilities"
        className="scroll-mt-24 bg-[var(--platform-bg)] py-16 md:py-24"
      >
        <Container>
          <h2 className="platform-display text-3xl font-semibold text-[var(--platform-ink)] md:text-4xl">
            What the platform does
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--platform-muted)]">
            One SaaS application — your brand on a subdomain or custom domain.
          </p>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2">
            {capabilities.map((item) => (
              <li key={item.id} className="border-l-2 border-[var(--platform-accent)] pl-5">
                <h3 className="text-lg font-semibold text-[var(--platform-ink)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--platform-muted)]">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-12 flex flex-col gap-4 rounded-[var(--radius-card)] bg-[var(--platform-ink)] px-6 py-8 text-white md:flex-row md:items-center md:justify-between md:px-10">
            <div>
              <p className="platform-display text-2xl font-semibold">
                Try the live product
              </p>
              <p className="mt-2 max-w-xl text-sm text-white/70">
                {liveDemo.hint}
              </p>
            </div>
            <a href={liveDemo.url} target="_blank" rel="noreferrer">
              <Button
                size="lg"
                className="w-full bg-[var(--platform-accent)] text-white hover:bg-[var(--platform-accent-hot)] md:w-auto"
              >
                {liveDemo.label}
              </Button>
            </a>
          </div>
        </Container>
      </section>

      <section className="bg-[var(--platform-ink)] py-16 text-white md:py-24">
        <Container>
          <h2 className="platform-display text-3xl font-semibold md:text-4xl">
            {nation.title}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/75 md:text-lg">
            {nation.body}
          </p>
        </Container>
      </section>

      <section
        id="plans"
        className="scroll-mt-24 bg-white py-16 md:py-24"
      >
        <Container>
          <h2 className="platform-display text-3xl font-semibold text-[var(--platform-ink)] md:text-4xl">
            Plans
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--platform-muted)]">
            Pricing is configurable per rollout. Use these packages as a starting
            conversation — update them anytime in platform site constants.
          </p>
          <ul className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className={
                  plan.featured
                    ? 'flex flex-col border-2 border-[var(--platform-ink)] bg-[var(--platform-bg)] p-6'
                    : 'flex flex-col border border-[var(--platform-ink)]/15 bg-white p-6'
                }
              >
                <p className="text-sm font-medium uppercase tracking-wider text-[var(--platform-muted)]">
                  {plan.name}
                </p>
                <p className="mt-2 platform-display text-3xl font-semibold text-[var(--platform-ink)]">
                  {plan.priceLabel}
                  {plan.period ? (
                    <span className="ml-1 text-sm font-normal text-[var(--platform-muted)]">
                      {plan.period}
                    </span>
                  ) : null}
                </p>
                <p className="mt-3 text-sm text-[var(--platform-muted)]">
                  {plan.description}
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-[var(--platform-ink)]">
                  {plan.highlights.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
                <Link
                  to={`${ROUTES.PLATFORM.DEMO}?interest=${plan.featured ? 'enroll' : 'demo'}&plan=${plan.id}`}
                  className="mt-6"
                >
                  <Button
                    fullWidth
                    className={
                      plan.featured
                        ? 'bg-[var(--platform-ink)] text-white hover:bg-black'
                        : undefined
                    }
                    variant={plan.featured ? 'primary' : 'secondary'}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="bg-[var(--platform-bg)] py-16 md:py-20">
        <Container className="text-center">
          <h2 className="platform-display text-3xl font-semibold text-[var(--platform-ink)]">
            Ready when you are
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--platform-muted)]">
            Request a walkthrough, explore the live restaurant demo, or start
            enrollment for your brand.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={ROUTES.PLATFORM.DEMO}>
              <Button
                size="lg"
                className="bg-[var(--platform-accent)] text-white hover:bg-[var(--platform-accent-hot)]"
              >
                Request demo / enroll
              </Button>
            </Link>
            <a href={liveDemo.url} target="_blank" rel="noreferrer">
              <Button size="lg" variant="secondary">
                Open live demo
              </Button>
            </a>
          </div>
        </Container>
      </section>
    </div>
  )
}
