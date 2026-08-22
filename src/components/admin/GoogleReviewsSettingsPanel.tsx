import { useEffect, useState } from 'react'
import { ExternalLink, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useOrganization } from '@/contexts/OrganizationContext'
import * as settingsService from '@/services/settingsService'
import {
  GOOGLE_PLACE_ID_SETTING_KEY,
  GOOGLE_REVIEWS_WIDGET_CLASS_SETTING_KEY,
  GOOGLE_REVIEWS_WIDGET_SRC_SETTING_KEY,
  googleWriteReviewUrl,
} from '@/utils/googleReviews'

export function GoogleReviewsSettingsPanel() {
  const org = useOrganization()
  const [placeId, setPlaceId] = useState('')
  const [widgetSrc, setWidgetSrc] = useState('')
  const [widgetClass, setWidgetClass] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    void settingsService.getGoogleReviewsSettings().then((result) => {
      if (cancelled) return
      if (result.success) {
        setPlaceId(result.data.placeId)
        setWidgetSrc(result.data.widgetSrc)
        setWidgetClass(result.data.widgetClass)
      }
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    const result = await settingsService.setGoogleReviewsSettings({
      placeId,
      widgetSrc,
      widgetClass,
    })
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setPlaceId(result.data.placeId)
    setWidgetSrc(result.data.widgetSrc)
    setWidgetClass(result.data.widgetClass)
    org.patchOrganizationSettings({
      [GOOGLE_PLACE_ID_SETTING_KEY]: result.data.placeId,
      [GOOGLE_REVIEWS_WIDGET_SRC_SETTING_KEY]: result.data.widgetSrc,
      [GOOGLE_REVIEWS_WIDGET_CLASS_SETTING_KEY]: result.data.widgetClass,
    })
    toast.success('Google reviews settings saved for this restaurant')
  }

  const previewWriteUrl = placeId.trim()
    ? googleWriteReviewUrl(placeId)
    : ''

  if (isLoading) {
    return (
      <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <h3 className="text-lg font-semibold text-text-primary">
          Google reviews
        </h3>
        <p className="mt-2 text-sm text-text-secondary">Loading…</p>
      </section>
    )
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            <Star className="h-5 w-5 fill-accent text-accent" aria-hidden="true" />
            Google reviews
          </h3>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            Link this restaurant’s own Google Business Profile. Reviews stay on
            Google; your site only shows them and invites customers to write
            one after ordering. Each restaurant uses its own Place ID — never
            another location’s.
          </p>
        </div>
      </div>

      <div className="mt-4 grid max-w-xl gap-3">
        <Input
          label="Google Place ID or Maps place URL"
          value={placeId}
          disabled={isSaving}
          onChange={(event) => setPlaceId(event.target.value)}
          placeholder="ChIJ… or https://www.google.com/maps/place/…"
        />
        <p className="text-xs text-text-secondary">
          Paste a Place ID, or open your listing in Google Maps → copy the full
          place URL from the address bar (not a short maps.app.goo.gl link).
          That enables “Review us on Google” after orders.
        </p>

        <Input
          label="Reviews widget script URL (optional)"
          value={widgetSrc}
          disabled={isSaving}
          onChange={(event) => setWidgetSrc(event.target.value)}
          placeholder="https://widgets.sociablekit.com/google-reviews/widget.js"
        />
        <p className="text-xs text-text-secondary">
          SociableKIT: use their widget.js URL. Trustindex: their loader.js URL.
          When set, the homepage embeds live Google reviews for this restaurant.
        </p>

        <Input
          label="Widget container class (optional)"
          value={widgetClass}
          disabled={isSaving}
          onChange={(event) => setWidgetClass(event.target.value)}
          placeholder="sk-ww-google-reviews|12345678"
        />
        <p className="text-xs text-text-secondary">
          SociableKIT free: paste{' '}
          <code className="text-xs">sk-ww-google-reviews</code>
          then <code className="text-xs">|</code> then your embed ID (from their
          embed code’s <code className="text-xs">data-embed-id</code>). Elfsight:
          paste only their <code className="text-xs">elfsight-app-…</code> class.
        </p>
      </div>

      {previewWriteUrl ? (
        <a
          href={previewWriteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark"
        >
          Preview write-a-review link
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}

      <Button
        type="button"
        className="mt-4"
        disabled={isSaving}
        onClick={() => void handleSave()}
      >
        {isSaving ? 'Saving…' : 'Save Google reviews'}
      </Button>
    </section>
  )
}
