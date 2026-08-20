import { useEffect, useMemo, useState } from 'react'
import { buildQrImageUrl } from '@/services/qrTableService'
import { useOrganization } from '@/contexts/OrganizationContext'
import { ROUTES } from '@/constants/ROUTES'
import {
  buildGoogleSetupChecklist,
  buildStarterSeo,
  CUISINE_SETTING_KEY,
  galleryImageList,
  GOOGLE_MAPS_URL_SETTING_KEY,
  isFssaiExpired,
  isFssaiExpiringSoon,
  isWebsiteStarterTrack,
} from '@/utils/websiteStarter'
import { restaurantDisplayName } from '@/utils/tenantFeatures'
import { loadStarterOrg } from '@/services/websiteStarterService'
import { readStarterAnalytics } from '@/utils/starterAnalytics'

export default function AdminStarterToolsPage() {
  const org = useOrganization()
  const [fssaiUntil, setFssaiUntil] = useState<string | null>(null)
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null)
  const name = restaurantDisplayName(org)
  const origin =
    typeof window !== 'undefined' ? window.location.origin : ''
  const menuUrl = `${origin}${ROUTES.MENU}`
  const shareText = `Check out our menu\n${menuUrl}`
  const mapsUrl =
    typeof org.settings[GOOGLE_MAPS_URL_SETTING_KEY] === 'string'
      ? String(org.settings[GOOGLE_MAPS_URL_SETTING_KEY])
      : org.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(org.address)}`
        : ''

  const gallery = galleryImageList(org.settings)
  const seo = buildStarterSeo({
    name,
    city:
      typeof org.settings.city === 'string' ? String(org.settings.city) : null,
    cuisine:
      typeof org.settings[CUISINE_SETTING_KEY] === 'string'
        ? String(org.settings[CUISINE_SETTING_KEY])
        : null,
  })

  const checklist = buildGoogleSetupChecklist({
    name,
    address: org.address,
    phone: org.phone,
    homepageUrl: origin,
    menuUrl,
    hoursWeekdays: org.weekdayHours,
    hoursWeekends: org.weekendHours,
    hasPhotos: gallery.length > 0,
  })

  const analytics = readStarterAnalytics(org.organizationId)

  const qrUrl = useMemo(() => buildQrImageUrl(menuUrl, 240), [menuUrl])

  useEffect(() => {
    void loadStarterOrg(org.organizationId).then((result) => {
      if (!result.success) return
      setFssaiUntil(
        result.data.fssai_valid_until
          ? String(result.data.fssai_valid_until).slice(0, 10)
          : null,
      )
      setOnboardingStatus(
        result.data.onboarding_status
          ? String(result.data.onboarding_status)
          : null,
      )
    })
  }, [org.organizationId])

  if (!isWebsiteStarterTrack(org.settings)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-heading text-2xl font-bold">Starter tools</h1>
        <p className="mt-2 text-sm text-text-secondary">
          These tools are for Website Starter restaurants. Your restaurant uses
          the full operations plan — use the normal Admin dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Your restaurant</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Website Starter checklist, QR, share, and basic analytics.
        </p>
      </div>

      <section className="grid gap-2 rounded border border-black/10 p-4 text-sm sm:grid-cols-2">
        <StatusRow
          label="Website"
          ok={onboardingStatus === 'live'}
          detail={onboardingStatus || 'unknown'}
        />
        <StatusRow
          label="Photos"
          ok={gallery.length >= 1}
          detail={`${gallery.length}/3`}
        />
        <StatusRow
          label="FSSAI"
          ok={!isFssaiExpired(fssaiUntil)}
          detail={
            isFssaiExpired(fssaiUntil)
              ? 'Expired — site gated'
              : isFssaiExpiringSoon(fssaiUntil)
                ? `Expiring ${fssaiUntil}`
                : fssaiUntil || 'Add validity date'
          }
        />
        <StatusRow label="Menu URL" ok detail={menuUrl} />
      </section>

      <section className="rounded border border-black/10 p-4">
        <h2 className="font-heading text-lg font-semibold">This month (basic)</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Local device counters for Starter — Growth adds full analytics later.
        </p>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <li>Website visitors: {analytics.visitors}</li>
          <li>Menu views: {analytics.menuViews}</li>
          <li>WhatsApp clicks: {analytics.whatsappClicks}</li>
          <li>Call clicks: {analytics.callClicks}</li>
          <li>Directions: {analytics.directionsClicks}</li>
        </ul>
      </section>

      <section className="rounded border border-black/10 p-4">
        <h2 className="font-heading text-lg font-semibold">Menu QR</h2>
        <img src={qrUrl} alt="Menu QR" className="mt-3 h-40 w-40" />
        <a
          className="mt-2 inline-block text-sm text-primary underline"
          href={qrUrl}
          download={`${org.slug || 'menu'}-qr.png`}
          target="_blank"
          rel="noreferrer"
        >
          Download QR
        </a>
      </section>

      <section className="rounded border border-black/10 p-4">
        <h2 className="font-heading text-lg font-semibold">Share</h2>
        <textarea
          readOnly
          className="mt-2 w-full rounded border border-black/15 p-2 text-sm"
          rows={3}
          value={shareText}
        />
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <a
            className="rounded border border-black/15 px-3 py-1.5"
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <a
            className="rounded border border-black/15 px-3 py-1.5"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(menuUrl)}`}
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </a>
          <button
            type="button"
            className="rounded border border-black/15 px-3 py-1.5"
            onClick={() => void navigator.clipboard.writeText(shareText)}
          >
            Copy link
          </button>
        </div>
      </section>

      <section className="rounded border border-black/10 p-4">
        <h2 className="font-heading text-lg font-semibold">Get directions</h2>
        {mapsUrl ? (
          <a
            className="mt-2 inline-block text-primary underline"
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open Google Maps
          </a>
        ) : (
          <p className="mt-2 text-sm text-text-secondary">
            Add a Maps link in setup.
          </p>
        )}
      </section>

      <section className="rounded border border-black/10 p-4">
        <h2 className="font-heading text-lg font-semibold">SEO (auto)</h2>
        <p className="mt-2 text-sm">
          <strong>Title:</strong> {seo.title}
        </p>
        <p className="mt-1 text-sm">
          <strong>Description:</strong> {seo.description}
        </p>
      </section>

      <section className="rounded border border-black/10 p-4">
        <h2 className="font-heading text-lg font-semibold">
          Google setup checklist
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {checklist.map((item) => (
            <li key={item.label} className="flex gap-2">
              <span>{item.ready ? '✅' : '🟡'}</span>
              <span>
                <strong>{item.label}</strong> — {item.detail}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function StatusRow({
  label,
  ok,
  detail,
}: {
  label: string
  ok: boolean
  detail: string
}) {
  return (
    <div>
      <div className="font-medium">
        {ok ? '🟢' : '🟡'} {label}
      </div>
      <div className="truncate text-xs text-text-secondary">{detail}</div>
    </div>
  )
}
