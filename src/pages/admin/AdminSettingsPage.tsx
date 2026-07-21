import toast from 'react-hot-toast'
import { ConfigBanner } from '@/components/ui/ConfigBanner'
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  CONTACT,
  OPENING_HOURS,
} from '@/constants/APP'
import {
  FREE_DELIVERY_THRESHOLD,
  ORDER_DELIVERY_CHARGE,
  ORDER_TAX_RATE,
} from '@/constants/ORDER'
import {
  isRazorpayConfigured,
} from '@/services/paymentService'
import { isSupabaseConfigured } from '@/services/supabaseClient'
import { formatPrice } from '@/utils/format'

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Restaurant configuration and platform status.
        </p>
      </div>

      {!isSupabaseConfigured && <ConfigBanner />}

      <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <h3 className="text-lg font-semibold text-text-primary">
          Restaurant Information
        </h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-secondary">Name</dt>
            <dd className="font-medium text-text-primary">{APP_NAME}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Tagline</dt>
            <dd className="font-medium text-text-primary">{APP_TAGLINE}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-text-secondary">Description</dt>
            <dd className="font-medium text-text-primary">{APP_DESCRIPTION}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-text-secondary">Address</dt>
            <dd className="font-medium text-text-primary">
              <a
                href={CONTACT.mapsDirectionsUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                {CONTACT.address}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Phone</dt>
            <dd className="font-medium text-text-primary">{CONTACT.phone}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Email</dt>
            <dd className="font-medium text-text-primary">{CONTACT.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Weekday Hours</dt>
            <dd className="font-medium text-text-primary">
              {OPENING_HOURS.weekdays}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Weekend Hours</dt>
            <dd className="font-medium text-text-primary">
              {OPENING_HOURS.weekends}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-text-secondary">
          To change restaurant details, update{' '}
          <code className="rounded bg-background px-1">src/constants/APP.ts</code>{' '}
          and redeploy.
        </p>
      </section>

      <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <h3 className="text-lg font-semibold text-text-primary">
          Order & Pricing
        </h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-text-secondary">Tax Rate</dt>
            <dd className="font-medium text-text-primary">
              {(ORDER_TAX_RATE * 100).toFixed(0)}%
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Delivery Charge</dt>
            <dd className="font-medium text-text-primary">
              {formatPrice(ORDER_DELIVERY_CHARGE)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Free Delivery Above</dt>
            <dd className="font-medium text-text-primary">
              {formatPrice(FREE_DELIVERY_THRESHOLD)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-text-secondary">
          Pricing rules are defined in{' '}
          <code className="rounded bg-background px-1">src/constants/ORDER.ts</code>.
        </p>
      </section>

      <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <h3 className="text-lg font-semibold text-text-primary">
          Integrations
        </h3>
        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex items-center justify-between rounded-[var(--radius-button)] bg-background px-4 py-3">
            <span className="text-text-primary">Supabase</span>
            <span
              className={
                isSupabaseConfigured
                  ? 'font-medium text-success'
                  : 'font-medium text-error'
              }
            >
              {isSupabaseConfigured ? 'Connected' : 'Not configured'}
            </span>
          </li>
          <li className="flex items-center justify-between rounded-[var(--radius-button)] bg-background px-4 py-3">
            <span className="text-text-primary">Razorpay (online payments)</span>
            <span
              className={
                isRazorpayConfigured()
                  ? 'font-medium text-success'
                  : 'font-medium text-text-secondary'
              }
            >
              {isRazorpayConfigured() ? 'Live mode' : 'Demo mode'}
            </span>
          </li>
        </ul>
        <button
          type="button"
          onClick={() =>
            toast('Integration settings are managed via environment variables.')
          }
          className="mt-4 text-sm font-medium text-primary hover:text-primary-dark"
        >
          Learn about environment setup →
        </button>
      </section>
    </div>
  )
}
