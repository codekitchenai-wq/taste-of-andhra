import { Link } from 'react-router-dom'
import { Globe, Mail, MapPin, Phone, Share2 } from 'lucide-react'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import {
  footerCustomerLinks,
  footerQuickLinks,
  footerTestPersonaLinks,
  onamSpecialNavLink,
} from '@/data/navigation'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Container } from '@/components/ui/Container'
import { FooterTestHelpers } from '@/components/layout/FooterTestHelpers'
import {
  isSpiceMalabarStorefront,
  showStorefrontQaHelpers,
  storefrontContact,
  storefrontSocialLinks,
} from '@/utils/storefrontCopy'
import { useStorefrontWhatsApp } from '@/hooks/useStorefrontWhatsApp'
import { useIsLandingPage } from '@/hooks/useIsLandingPage'

export function Footer() {
  const org = useOrganization()
  const contact = storefrontContact(org)
  const showQa = showStorefrontQaHelpers(org)
  const quickLinks = isSpiceMalabarStorefront(org)
    ? [footerQuickLinks[0], onamSpecialNavLink, ...footerQuickLinks.slice(1)]
    : footerQuickLinks
  const whatsApp = useStorefrontWhatsApp()
  const isLandingPage = useIsLandingPage()
  const showWhatsApp = whatsApp.enabled && whatsApp.orderUrl && !isLandingPage
  const socialLinks = storefrontSocialLinks(org)
  const blurb = contact.description

  return (
    <footer className="border-t border-black/5 bg-surface">
      <Container as="section" className="py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-primary">
              {contact.name}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {blurb}
            </p>
            {socialLinks.length > 0 || showWhatsApp ? (
            <div className="mt-4 flex gap-3">
              {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-white"
                aria-label={link.label}
              >
                {link.label === 'Instagram' ? (
                  <Share2 className="h-4 w-4" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
              </a>
              ))}
              {showWhatsApp ? (
                <WhatsAppLink href={whatsApp.orderUrl!} variant="icon" className="h-9 w-9">
                  WhatsApp
                </WhatsAppLink>
              ) : null}
            </div>
            ) : null}
          </div>

          <div>
            <h3 className="font-semibold">Quick Links</h3>
            <ul className="mt-4 space-y-2">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-text-secondary transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {showQa &&
                footerTestPersonaLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-text-secondary transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold">Customer</h3>
            <ul className="mt-4 space-y-2">
              {footerCustomerLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-text-secondary transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold">Contact & Hours</h3>
            <ul className="mt-4 space-y-3 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                <div>
                  <a
                    href={contact.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary"
                  >
                    {contact.address}
                  </a>
                  <a
                    href={contact.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-xs font-medium text-primary hover:text-primary-dark"
                  >
                    Get directions
                  </a>
                </div>
              </li>
              {contact.phones.map((phone) => (
                <li key={phone} className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-secondary" />
                  <a
                    href={`tel:${phone.replace(/\s/g, '')}`}
                    className="hover:text-primary"
                  >
                    {phone}
                  </a>
                </li>
              ))}
              {showWhatsApp ? (
                <li>
                  <WhatsAppLink href={whatsApp.orderUrl!} variant="inline">
                    Order on WhatsApp
                  </WhatsAppLink>
                </li>
              ) : null}
              {contact.email ? (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-secondary" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="hover:text-primary"
                  >
                    {contact.email}
                  </a>
                </li>
              ) : null}
              <li>
                <p className="font-medium text-text-primary">Opening Hours</p>
                <p>Mon–Fri: {contact.weekdayHours}</p>
                <p>Sat–Sun: {contact.weekendHours}</p>
              </li>
            </ul>
          </div>
        </div>

        {showQa ? <FooterTestHelpers /> : null}

        <div className="mt-10 border-t border-black/5 pt-6 text-center text-sm text-text-secondary">
          © {new Date().getFullYear()} {contact.name}. All rights reserved.
        </div>
      </Container>
    </footer>
  )
}
