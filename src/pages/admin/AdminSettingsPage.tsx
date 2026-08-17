import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { DeliverySettingsPanel } from '@/components/admin/DeliverySettingsPanel'
import { PrinterSettingsPanel } from '@/components/admin/PrinterSettingsPanel'
import { StoreTimingsPanel } from '@/components/admin/StoreTimingsPanel'
import { OrderNumberSequencePanel } from '@/components/admin/OrderNumberSequencePanel'
import { GstSettingsPanel } from '@/components/admin/GstSettingsPanel'
import { WhatsAppSettingsPanel } from '@/components/admin/WhatsAppSettingsPanel'
import { ConfigBanner } from '@/components/ui/ConfigBanner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { APP_NAME } from '@/constants/APP'
import {
  DEFAULT_ETA_MINUTES,
  FREE_DELIVERY_THRESHOLD,
  ORDER_DELIVERY_CHARGE,
  ORDER_TAX_RATE,
} from '@/constants/ORDER'
import {
  isRazorpayConfigured,
} from '@/services/paymentService'
import { useOrganization } from '@/contexts/OrganizationContext'
import * as deliveryQuoteService from '@/services/deliveryQuoteService'
import type { PidgeConfigStatus } from '@/services/deliveryQuoteService'
import * as settingsService from '@/services/settingsService'
import { isSupabaseConfigured } from '@/services/supabaseClient'
import { formatPrice } from '@/utils/format'
import { storefrontContact } from '@/utils/storefrontCopy'

export default function AdminSettingsPage() {
  const contact = storefrontContact(useOrganization())
  const [etaMinutes, setEtaMinutes] = useState(String(DEFAULT_ETA_MINUTES))
  const [isLoadingEta, setIsLoadingEta] = useState(true)
  const [isSavingEta, setIsSavingEta] = useState(false)
  const [upiVpa, setUpiVpa] = useState('')
  const [upiPayeeName, setUpiPayeeName] = useState(APP_NAME)
  const [isLoadingUpi, setIsLoadingUpi] = useState(true)
  const [isSavingUpi, setIsSavingUpi] = useState(false)
  const [pidgeStatus, setPidgeStatus] = useState<PidgeConfigStatus | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoadingEta(true)
      setIsLoadingUpi(true)
      const [etaResult, upiResult, pidgeResult] = await Promise.all([
        settingsService.getDefaultEtaMinutes(),
        settingsService.getUpiSettings(),
        deliveryQuoteService.getPidgeStatus(),
      ])
      if (cancelled) return

      if (etaResult.success) {
        setEtaMinutes(String(etaResult.data))
      }
      if (upiResult.success) {
        setUpiVpa(upiResult.data.vpa)
        setUpiPayeeName(upiResult.data.payeeName)
      }
      if (pidgeResult.success) {
        setPidgeStatus(pidgeResult.data)
      }
      setIsLoadingEta(false)
      setIsLoadingUpi(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSaveEta = async () => {
    const minutes = Number.parseInt(etaMinutes, 10)
    setIsSavingEta(true)
    const result = await settingsService.setDefaultEtaMinutes(minutes)
    setIsSavingEta(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setEtaMinutes(String(result.data))
    toast.success(`Default delivery time set to ${result.data} minutes`)
  }

  const handleSaveUpi = async () => {
    setIsSavingUpi(true)
    const result = await settingsService.setUpiSettings({
      vpa: upiVpa,
      payeeName: upiPayeeName,
    })
    setIsSavingUpi(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setUpiVpa(result.data.vpa)
    setUpiPayeeName(result.data.payeeName)
    toast.success('UPI payment settings saved')
  }

  return (
    <div className="space-y-6">
      {!isSupabaseConfigured && <ConfigBanner />}

      <DeliverySettingsPanel />

      <StoreTimingsPanel />

      <OrderNumberSequencePanel />

      <GstSettingsPanel />

      <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <h3 className="text-lg font-semibold text-text-primary">
          Delivery time
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          Default minutes promised when a customer places an order. You can still
          adjust each order on the kitchen board.
        </p>
        <div className="mt-4 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="Default ETA (minutes)"
            type="number"
            min={5}
            max={240}
            value={etaMinutes}
            disabled={isLoadingEta || isSavingEta}
            onChange={(event) => setEtaMinutes(event.target.value)}
          />
          <Button
            type="button"
            disabled={isLoadingEta || isSavingEta}
            onClick={() => void handleSaveEta()}
            className="shrink-0"
          >
            {isSavingEta ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <h3 className="text-lg font-semibold text-text-primary">
          UPI payment QR
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          Used for phone orders and pay-later collection. Customers scan a QR
          with this UPI ID and the billed amount.
        </p>
        <div className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
          <Input
            label="UPI ID (VPA)"
            value={upiVpa}
            disabled={isLoadingUpi || isSavingUpi}
            onChange={(event) => setUpiVpa(event.target.value)}
            placeholder="restaurant@upi"
          />
          <Input
            label="Payee name"
            value={upiPayeeName}
            disabled={isLoadingUpi || isSavingUpi}
            onChange={(event) => setUpiPayeeName(event.target.value)}
            placeholder={APP_NAME}
          />
        </div>
        <Button
          type="button"
          className="mt-4"
          disabled={isLoadingUpi || isSavingUpi}
          onClick={() => void handleSaveUpi()}
        >
          {isSavingUpi ? 'Saving…' : 'Save UPI settings'}
        </Button>
      </section>

      <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <h3 className="text-lg font-semibold text-text-primary">
          Restaurant Information
        </h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-secondary">Name</dt>
            <dd className="font-medium text-text-primary">{contact.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Tagline</dt>
            <dd className="font-medium text-text-primary">{contact.tagline}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-text-secondary">Description</dt>
            <dd className="font-medium text-text-primary">{contact.description}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-text-secondary">Address</dt>
            <dd className="font-medium text-text-primary">
              <a
                href={contact.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                {contact.address}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Phone</dt>
            <dd className="font-medium text-text-primary">
              {contact.phones.join(' / ')}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Email</dt>
            <dd className="font-medium text-text-primary">
              {contact.email || 'Not listed'}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-text-secondary">
          Store open hours are managed in <strong>Store timings</strong> above.
        </p>
      </section>

      <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <h3 className="text-lg font-semibold text-text-primary">
          Order & Pricing
        </h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-text-secondary">GST rate (when enabled)</dt>
            <dd className="font-medium text-text-primary">
              {(ORDER_TAX_RATE * 100).toFixed(0)}%
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Default delivery charge</dt>
            <dd className="font-medium text-text-primary">
              {formatPrice(ORDER_DELIVERY_CHARGE)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Default free delivery above</dt>
            <dd className="font-medium text-text-primary">
              {formatPrice(FREE_DELIVERY_THRESHOLD)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-text-secondary">
          GST on new orders is controlled in <strong>GST</strong> above. Live
          delivery fees are edited in <strong>Delivery &amp; Service Areas</strong>.
        </p>
      </section>

      <PrinterSettingsPanel />

      <WhatsAppSettingsPanel />

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
          <li className="flex items-center justify-between rounded-[var(--radius-button)] bg-background px-4 py-3">
            <span className="text-text-primary">Pidge (third-party delivery)</span>
            <span
              className={
                pidgeStatus?.configured && pidgeStatus.functionsReachable
                  ? 'font-medium text-success'
                  : 'font-medium text-text-secondary'
              }
            >
              {!pidgeStatus
                ? 'Checking…'
                : pidgeStatus.configured && pidgeStatus.functionsReachable
                  ? 'Connected'
                  : pidgeStatus.functionsReachable
                    ? 'Secrets missing'
                    : 'Not deployed'}
            </span>
          </li>
        </ul>
        <button
          type="button"
          onClick={() =>
            toast(
              'Supabase and Razorpay use environment variables. Pidge uses Admin → Delivery settings plus Edge Function secrets — see docs/PIDGE_SETUP.md.',
            )
          }
          className="mt-4 text-sm font-medium text-primary hover:text-primary-dark"
        >
          Learn about environment setup →
        </button>
      </section>
    </div>
  )
}
