import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { useOrganization } from '@/contexts/OrganizationContext'
import { storefrontContact } from '@/utils/storefrontCopy'

export default function PrivacyPolicyPage() {
  const contact = storefrontContact(useOrganization())

  return (
    <Container as="main" className="py-10 md:py-16">
      <PageHeader
        title="Privacy Policy"
        description={`How ${contact.name} collects, uses, and protects your information when you order online or receive WhatsApp updates.`}
      />

      <div className="max-w-3xl space-y-8 text-sm leading-relaxed text-text-secondary md:text-base">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">
            Information we collect
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Name, mobile number, and email address you provide.</li>
            <li>Delivery address and location pin used for your order.</li>
            <li>Order history, payment status, and order preferences.</li>
            <li>
              Messages you send us on WhatsApp, and delivery receipts for
              messages we send you.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">
            How we use your information
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Prepare, deliver, and invoice the orders you place.</li>
            <li>
              Send order status updates and one-time login codes on WhatsApp or
              SMS.
            </li>
            <li>Respond to support requests and delivery issues.</li>
            <li>Meet tax, accounting, and legal obligations.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">
            WhatsApp messages
          </h2>
          <p>
            We use the WhatsApp Business Platform to send order updates and
            login codes to the mobile number on your account. We do not sell
            your number or send promotional messages without your consent. Reply{' '}
            <strong>STOP</strong> on WhatsApp at any time to stop receiving
            order updates from us.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">
            Sharing your information
          </h2>
          <p>
            We share only what is needed to complete your order: delivery
            partners receive your name, address, and phone number; payment
            providers receive payment details; messaging providers receive your
            phone number to deliver the message. We do not sell your personal
            data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">
            Data retention and security
          </h2>
          <p>
            Order and invoice records are kept as long as required for business
            and tax purposes. Access is restricted to authorised restaurant
            staff, and data is stored on access-controlled systems.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">
            Your choices
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Update your profile details from your account page.</li>
            <li>Reply STOP on WhatsApp to unsubscribe from order updates.</li>
            <li>
              Request deletion of your account and personal data by contacting
              us.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">Contact us</h2>
          <p>
            {contact.name}
            <br />
            {contact.address}
            <br />
            Phone: {contact.phone}
            {contact.email ? (
              <>
                <br />
                Email: {contact.email}
              </>
            ) : null}
          </p>
        </section>
      </div>
    </Container>
  )
}
