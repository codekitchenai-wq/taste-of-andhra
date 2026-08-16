import { CONTACT } from '@/constants/APP'
import { PLATFORM_ROOT_DOMAIN, PLATFORM_WWW_URL } from '@/constants/PLATFORM'

/**
 * Editable marketing content for www.directapp.in.
 * Change copy, plans, CTAs, and contact here — no route/UI rewrites required
 * for most content updates.
 */
export const PLATFORM_SITE = {
  brand: {
    name: 'directapp.in',
    legalName: 'DirectApp',
    tagline: 'Empowering SME digital presence & growth',
    shortDescription:
      'Multi-tenant software for restaurants and growing small & medium businesses — order online, run operations, and scale with confidence.',
    logoSrc: '/images/brand/directapp-logo.png',
    logoAlt: 'directapp.in — Empowering SME digital presence & growth',
  },

  /** Live product demo (Taste of Andhra storefront on the same stack). */
  liveDemo: {
    label: 'See live restaurant demo',
    url: 'https://thetasteofandhra.directapp.in',
    hint: 'Explore a real storefront built on DirectApp — menu, cart, orders, and more.',
  },

  contact: {
    phone: CONTACT.phone,
    email: CONTACT.email,
    address: CONTACT.address,
    mapsDirectionsUrl: CONTACT.mapsDirectionsUrl,
  },

  hero: {
    headline: 'Help every neighbourhood business go digital',
    supporting:
      'DirectApp gives restaurants and small & medium industries a ready platform to take orders, manage operations, and grow — so local enterprise can scale and strengthen the nation.',
    primaryCta: { label: 'Request a demo', href: '/demo' },
    secondaryCta: { label: 'Explore live demo', href: 'https://thetasteofandhra.directapp.in' },
  },

  mission: {
    title: 'Built for Bharat’s SMEs',
    body: 'Small and medium businesses are the backbone of local employment and community life. DirectApp is designed so a single kitchen, café, or growing brand can launch online quickly — with the same reliability used by our pilot restaurants — without building software from scratch.',
  },

  audiences: [
    {
      id: 'restaurants',
      title: 'Restaurants & cloud kitchens',
      body: 'Online menu, cart, delivery, WhatsApp updates, and admin tools under your own subdomain or custom domain.',
    },
    {
      id: 'cafes',
      title: 'Cafés & QSR',
      body: 'Fast ordering, offers, and branch-ready structure as you expand across neighbourhoods.',
    },
    {
      id: 'sme',
      title: 'Growing SMEs',
      body: 'A multi-tenant foundation that can extend beyond food — helping medium-scale operators digitize customer journeys.',
    },
  ],

  capabilities: [
    {
      id: 'storefront',
      title: 'Branded online storefront',
      body: 'Each tenant gets a subdomain on directapp.in, or connects their own domain so customers see their brand — not ours.',
    },
    {
      id: 'orders',
      title: 'Orders end to end',
      body: 'Menu, cart, checkout, kitchen/admin views, and delivery partner flows in one stack.',
    },
    {
      id: 'comms',
      title: 'Customer communication',
      body: 'WhatsApp and notification paths so guests stay informed from order to delivery.',
    },
    {
      id: 'multi',
      title: 'Multi-tenant by design',
      body: 'Master console for onboarding, plans, and features — one platform, many independent businesses.',
    },
  ],

  nation: {
    title: 'Scale local enterprise, strengthen the nation',
    body: 'When a family restaurant or mid-size kitchen can compete digitally, jobs stay local and customers keep supporting neighbourhood brands. DirectApp exists to make that leap practical — affordable to start, ready to grow.',
  },

  plans: [
    {
      id: 'starter',
      name: 'Starter',
      priceLabel: 'Talk to us',
      period: '',
      description: 'Single-location restaurant operations to go live quickly.',
      highlights: [
        'Branded storefront subdomain',
        'Menu, orders & admin',
        'Customer accounts & cart',
        '30-day guided onboarding available',
      ],
      cta: 'Request starter demo',
      featured: false,
    },
    {
      id: 'growth',
      name: 'Growth',
      priceLabel: 'Custom',
      period: 'per month',
      description: 'For multi-branch and add-on modules as you scale.',
      highlights: [
        'Everything in Starter',
        'Branches & QR tables',
        'Delivery integrations',
        'WhatsApp ordering add-ons',
        'Custom domain support',
      ],
      cta: 'Enroll / get pricing',
      featured: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      priceLabel: 'Custom',
      period: '',
      description: 'For groups and medium-scale operators needing tailored rollout.',
      highlights: [
        'Dedicated onboarding',
        'Feature packaging per brand',
        'Priority support',
        'Roadmap alignment for SME verticals',
      ],
      cta: 'Talk to sales',
      featured: false,
    },
  ],

  demoForm: {
    title: 'Request a demo or enroll',
    description:
      'Tell us about your business. We will walk you through the live product and help you choose a plan.',
    interests: [
      { value: 'demo', label: 'Product demo' },
      { value: 'enroll', label: 'Enroll on a plan' },
      { value: 'both', label: 'Demo + enrollment' },
    ],
    businessTypes: [
      { value: 'restaurant', label: 'Restaurant / cloud kitchen' },
      { value: 'cafe', label: 'Café / QSR' },
      { value: 'bakery', label: 'Bakery / sweets' },
      { value: 'sme_other', label: 'Other SME / industry' },
    ],
  },

  footer: {
    blurb:
      'DirectApp helps restaurants and SMEs digitize ordering and operations — from first online order to multi-location growth.',
  },

  urls: {
    apex: PLATFORM_WWW_URL,
    rootDomain: PLATFORM_ROOT_DOMAIN,
  },
} as const

export type PlatformPlanId = (typeof PLATFORM_SITE.plans)[number]['id']
export type PlatformInterest =
  (typeof PLATFORM_SITE.demoForm.interests)[number]['value']
export type PlatformBusinessType =
  (typeof PLATFORM_SITE.demoForm.businessTypes)[number]['value']
