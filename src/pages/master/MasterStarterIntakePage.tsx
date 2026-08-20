import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ENABLE_STARTER_ONBOARDING } from '@/constants/ARCHITECTURE_GATES'
import { ROUTES } from '@/constants/ROUTES'
import {
  approveStarterGoLive,
  intakeWebsiteStarter,
  listPendingStarterOrgs,
  parseFssaiWithAi,
  rejectStarterGoLive,
  uploadOrgMedia,
  type StarterIntakeResult,
  type StarterOrgSummary,
} from '@/services/websiteStarterService'
import { proposeDisplayName, proposeSlugBase } from '@/utils/websiteStarter'
import { useEffect } from 'react'

export default function MasterStarterIntakePage() {
  const [legalName, setLegalName] = useState('')
  const [preferredStoreName, setPreferredStoreName] = useState('')
  const [fssaiLicense, setFssaiLicense] = useState('')
  const [fssaiValidUntil, setFssaiValidUntil] = useState('')
  const [fssaiCertificateUrl, setFssaiCertificateUrl] = useState('')
  const [city, setCity] = useState('')
  const [addressFromFssai, setAddressFromFssai] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<StarterIntakeResult | null>(null)
  const [pending, setPending] = useState<StarterOrgSummary[]>([])
  const [certFile, setCertFile] = useState<File | null>(null)

  const previewSlug = useMemo(() => {
    const name = proposeDisplayName(legalName, preferredStoreName)
    return proposeSlugBase(name) || 'restaurant'
  }, [legalName, preferredStoreName])

  async function refreshPending() {
    const result = await listPendingStarterOrgs()
    if (result.success) setPending(result.data)
  }

  useEffect(() => {
    void refreshPending()
  }, [])

  if (!ENABLE_STARTER_ONBOARDING) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-heading text-2xl font-bold">Website Starter intake</h1>
        <p className="mt-2 text-text-secondary">
          Enable with <code>VITE_ENABLE_STARTER_ONBOARDING=true</code>.
        </p>
      </div>
    )
  }

  async function onUploadCert(file: File) {
    setCertFile(file)
    setBusy(true)
    setError(null)
    // Temporary org-less path: upload under a staging prefix via a placeholder id
    // after create we re-upload if needed. For intake, parse from object URL via AI
    // by first creating a data URL is not ideal; upload after we have org.
    // Here we only keep the file for post-create upload + optional local OCR text.
    setBusy(false)
  }

  async function onParseFssai() {
    setBusy(true)
    setError(null)
    const result = await parseFssaiWithAi({
      certificateUrl: fssaiCertificateUrl || undefined,
    })
    setBusy(false)
    if (!result.success) {
      setError(result.message)
      return
    }
    if (result.data.legalName) setLegalName(result.data.legalName)
    if (result.data.fssaiLicense) setFssaiLicense(result.data.fssaiLicense)
    if (result.data.fssaiValidUntil) {
      setFssaiValidUntil(result.data.fssaiValidUntil)
    }
    if (result.data.address) setAddressFromFssai(result.data.address)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setCreated(null)

    const result = await intakeWebsiteStarter({
      legalName,
      preferredStoreName,
      fssaiLicense,
      fssaiValidUntil,
      fssaiCertificateUrl,
      city,
      ownerName,
      ownerEmail,
      ownerPhone,
      googleMapsUrl,
      cuisineType,
      addressFromFssai,
    })

    if (!result.success) {
      setBusy(false)
      setError(result.message)
      return
    }

    if (certFile) {
      const uploaded = await uploadOrgMedia({
        organizationId: result.data.organizationId,
        file: certFile,
        folder: 'fssai',
        slot: 'cert',
      })
      if (uploaded.success) {
        setFssaiCertificateUrl(uploaded.data)
        await intakePatchCert(result.data.organizationId, uploaded.data)
      }
    }

    setCreated(result.data)
    setBusy(false)
    void refreshPending()
  }

  async function intakePatchCert(organizationId: string, url: string) {
    const { updateStarterProfile } = await import(
      '@/services/websiteStarterService'
    )
    await updateStarterProfile(organizationId, { fssaiCertificateUrl: url })
  }

  async function onApprove(orgId: string) {
    setBusy(true)
    const result = await approveStarterGoLive(orgId)
    setBusy(false)
    if (!result.success) {
      setError(result.message)
      return
    }
    void refreshPending()
  }

  async function onReject(orgId: string) {
    const note = window.prompt('Optional note for the restaurant:') || undefined
    setBusy(true)
    const result = await rejectStarterGoLive(orgId, note)
    setBusy(false)
    if (!result.success) {
      setError(result.message)
      return
    }
    void refreshPending()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Website Starter intake
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          New restaurants only — does not change Taste of Andhra or Chopsticks.
          Lock FSSAI legal name, propose slug, send WhatsApp setup link.
        </p>
        <p className="mt-2 text-sm">
          <Link className="text-primary hover:underline" to={ROUTES.MASTER.ONBOARD}>
            Classic Growth onboard (CSV)
          </Link>
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {created && (
        <div className="space-y-3 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-emerald-900">
            Created {created.displayName} ({created.slug})
          </p>
          <p>
            Legal name locked: <strong>{created.legalName}</strong>
          </p>
          <p>
            Site:{' '}
            <a
              className="text-primary underline"
              href={created.homepageUrl}
              target="_blank"
              rel="noreferrer"
            >
              {created.homepageUrl}
            </a>
          </p>
          <p>
            Setup link:{' '}
            <a className="text-primary underline" href={created.setupUrl}>
              {created.setupUrl}
            </a>
          </p>
          {created.inviteError && (
            <p className="text-amber-800">{created.inviteError}</p>
          )}
          <label className="block font-medium text-emerald-900">
            WhatsApp message (copy &amp; send)
            <textarea
              className="mt-1 w-full rounded border border-emerald-200 bg-white p-2 font-mono text-xs"
              rows={14}
              readOnly
              value={created.whatsappMessage}
            />
          </label>
          <button
            type="button"
            className="rounded bg-emerald-700 px-3 py-1.5 text-white"
            onClick={() =>
              void navigator.clipboard.writeText(created.whatsappMessage)
            }
          >
            Copy WhatsApp message
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4 rounded border border-black/10 bg-surface p-4">
        <h2 className="font-heading text-lg font-semibold">New intake</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            FSSAI certificate (image/PDF)
            <input
              type="file"
              accept="image/*,application/pdf"
              className="mt-1 block w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onUploadCert(file)
              }}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            Or certificate URL (for AI parse)
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={fssaiCertificateUrl}
              onChange={(e) => setFssaiCertificateUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={busy || !fssaiCertificateUrl}
              onClick={() => void onParseFssai()}
              className="rounded border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              AI extract from certificate URL
            </button>
          </div>

          <label className="block text-sm sm:col-span-2">
            Legal name (FSSAI) — locked after create *
            <input
              required
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Preferred store / display name
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={preferredStoreName}
              onChange={(e) => setPreferredStoreName(e.target.value)}
              placeholder="Shown on website"
            />
          </label>
          <label className="block text-sm">
            Proposed slug preview
            <input
              readOnly
              className="mt-1 w-full rounded border border-black/10 bg-black/5 px-3 py-2 font-mono text-xs"
              value={previewSlug}
            />
          </label>
          <label className="block text-sm">
            FSSAI licence number
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={fssaiLicense}
              onChange={(e) => setFssaiLicense(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            FSSAI valid until
            <input
              type="date"
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={fssaiValidUntil}
              onChange={(e) => setFssaiValidUntil(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            City *
            <input
              required
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Address (from FSSAI)
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={addressFromFssai}
              onChange={(e) => setAddressFromFssai(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Owner name *
            <input
              required
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Owner email *
            <input
              required
              type="email"
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Owner WhatsApp *
            <input
              required
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Cuisine type
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
              placeholder="Malabar, South Indian…"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            Google Maps link
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create Website Starter + invite'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">
          Pending review / setup
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-text-secondary">No pending Website Starter tenants.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-black/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/5 text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-3 py-2">Restaurant</th>
                  <th className="px-3 py-2">Onboarding</th>
                  <th className="px-3 py-2">FSSAI</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((org) => (
                  <tr key={org.id} className="border-t border-black/10">
                    <td className="px-3 py-2">
                      <div className="font-medium">{org.name}</div>
                      <div className="font-mono text-xs text-text-secondary">
                        {org.slug}
                      </div>
                      <div className="text-xs text-text-secondary">
                        Legal: {org.legal_name || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2">{org.onboarding_status}</td>
                    <td className="px-3 py-2 text-xs">
                      {org.fssai_license || '—'}
                      <br />
                      {org.fssai_valid_until || 'no expiry'}
                    </td>
                    <td className="px-3 py-2 space-x-2">
                      <Link
                        className="text-primary hover:underline"
                        to={ROUTES.MASTER.tenant(org.id)}
                      >
                        Open
                      </Link>
                      <Link
                        className="text-primary hover:underline"
                        to={`${ROUTES.ADMIN.SETUP}?org=${org.id}`}
                      >
                        Continue setup
                      </Link>
                      {org.onboarding_status === 'pending_review' && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            className="text-emerald-700 hover:underline"
                            onClick={() => void onApprove(org.id)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="text-red-700 hover:underline"
                            onClick={() => void onReject(org.id)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
