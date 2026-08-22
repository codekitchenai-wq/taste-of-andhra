import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ENABLE_STARTER_ONBOARDING } from '@/constants/ARCHITECTURE_GATES'
import { ROUTES } from '@/constants/ROUTES'
import {
  approveStarterGoLive,
  listPendingStarterOrgs,
  loadStarterOrg,
  rejectStarterGoLive,
  updateStarterProfile,
  type StarterOrgSummary,
} from '@/services/websiteStarterService'
import {
  isFssaiExpired,
  isFssaiExpiringSoon,
} from '@/utils/websiteStarter'

/**
 * Single Master queue for Website Starter go-live and FSSAI field review.
 * FSSAI data is internal compliance only — never shown on public storefronts.
 */
export default function MasterApprovalsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('org')

  const [pending, setPending] = useState<StarterOrgSummary[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [legalName, setLegalName] = useState('')
  const [fssaiLicense, setFssaiLicense] = useState('')
  const [fssaiIssuedOn, setFssaiIssuedOn] = useState('')
  const [fssaiValidUntil, setFssaiValidUntil] = useState('')
  const [address, setAddress] = useState('')
  const [certificateUrl, setCertificateUrl] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null)

  async function refreshList() {
    const result = await listPendingStarterOrgs()
    if (result.success) setPending(result.data)
    else setError(result.message)
  }

  useEffect(() => {
    void refreshList()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    setError(null)
    setMessage(null)
    void loadStarterOrg(selectedId).then((result) => {
      if (cancelled) return
      if (!result.success) {
        setError(result.message)
        return
      }
      const row = result.data
      setDisplayName(String(row.name ?? ''))
      setLegalName(String(row.legal_name ?? ''))
      setFssaiLicense(String(row.fssai_license ?? ''))
      setFssaiValidUntil(
        row.fssai_valid_until
          ? String(row.fssai_valid_until).slice(0, 10)
          : '',
      )
      const settings = (row.settings as Record<string, unknown>) || {}
      setFssaiIssuedOn(
        typeof settings.fssai_issued_on === 'string'
          ? settings.fssai_issued_on.slice(0, 10)
          : '',
      )
      setAddress(String(row.address ?? ''))
      setCertificateUrl(String(row.fssai_certificate_url ?? ''))
      setOnboardingStatus(
        row.onboarding_status ? String(row.onboarding_status) : null,
      )
    })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const selectedSummary = useMemo(
    () => pending.find((o) => o.id === selectedId) ?? null,
    [pending, selectedId],
  )

  const fssaiHint = useMemo(() => {
    if (isFssaiExpired(fssaiValidUntil)) return 'Expired'
    if (isFssaiExpiringSoon(fssaiValidUntil)) return 'Expiring soon'
    if (!fssaiLicense.trim()) return 'Missing licence number'
    return null
  }, [fssaiLicense, fssaiValidUntil])

  function selectOrg(id: string) {
    setSearchParams({ org: id })
  }

  async function saveFssai() {
    if (!selectedId) return
    setBusy(true)
    setError(null)
    setMessage(null)
    const result = await updateStarterProfile(
      selectedId,
      {
        legalName,
        fssaiLicense,
        fssaiValidUntil,
        fssaiIssuedOn,
        fssaiCertificateUrl: certificateUrl || undefined,
        address,
      },
      { allowFssaiUpdate: true },
    )
    setBusy(false)
    if (!result.success) {
      setError(result.message)
      return
    }
    setMessage('FSSAI / legal fields saved (internal only — not on public site).')
    void refreshList()
  }

  async function onApprove() {
    if (!selectedId) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fssaiValidUntil.trim())) {
      setError(
        'Save a FSSAI valid until date before approving go-live (required for expiry tracking).',
      )
      return
    }
    setBusy(true)
    setError(null)
    const result = await approveStarterGoLive(selectedId)
    setBusy(false)
    if (!result.success) {
      setError(result.message)
      return
    }
    setMessage('Approved — site can go live.')
    setSearchParams({})
    void refreshList()
  }

  async function onReject() {
    if (!selectedId) return
    const note = window.prompt('Optional note for the restaurant:') ?? undefined
    setBusy(true)
    setError(null)
    const result = await rejectStarterGoLive(selectedId, note)
    setBusy(false)
    if (!result.success) {
      setError(result.message)
      return
    }
    setMessage('Rejected.')
    setSearchParams({})
    void refreshList()
  }

  if (!ENABLE_STARTER_ONBOARDING) {
    return (
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Approvals</h1>
        <p className="text-sm text-text-secondary">
          Enable with <code>VITE_ENABLE_STARTER_ONBOARDING=true</code>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Approvals
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Monitor Website Starter tenants, correct FSSAI fields from the
          certificate, and approve go-live. Licence details stay internal —
          they are not shown on the restaurant public site.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Queue</h2>
          {pending.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No pending Website Starter tenants.
            </p>
          ) : (
            <ul className="divide-y divide-black/10 rounded border border-black/10 bg-surface">
              {pending.map((org) => {
                const active = org.id === selectedId
                const needsReview = org.onboarding_status === 'pending_review'
                return (
                  <li key={org.id}>
                    <button
                      type="button"
                      onClick={() => selectOrg(org.id)}
                      className={`w-full px-3 py-3 text-left text-sm transition-colors ${
                        active
                          ? 'bg-primary/10'
                          : 'hover:bg-black/[0.03]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-text-primary">
                          {org.name}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            needsReview
                              ? 'bg-amber-100 text-amber-900'
                              : org.onboarding_status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-black/5 text-text-secondary'
                          }`}
                        >
                          {org.onboarding_status || '—'}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-text-secondary">
                        {org.slug}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        FSSAI: {org.fssai_license || 'not set'}
                        {org.fssai_valid_until
                          ? ` · until ${String(org.fssai_valid_until).slice(0, 10)}`
                          : ''}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-xs text-text-secondary">
            New restaurants:{' '}
            <Link
              className="text-primary hover:underline"
              to={ROUTES.MASTER.STARTER_INTAKE}
            >
              Starter intake
            </Link>
          </p>
        </section>

        <section className="space-y-4 rounded border border-black/10 bg-surface p-4">
          {!selectedId ? (
            <p className="text-sm text-text-secondary">
              Select a restaurant from the queue to review certificate fields
              and approve.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-heading text-lg font-semibold">
                    {displayName || selectedSummary?.name || 'Review'}
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Status: {onboardingStatus || '—'}
                    {fssaiHint ? ` · ${fssaiHint}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Link
                    className="text-primary hover:underline"
                    to={ROUTES.MASTER.tenant(selectedId)}
                  >
                    Tenant
                  </Link>
                  <Link
                    className="text-primary hover:underline"
                    to={ROUTES.MASTER.starterSetup(selectedId)}
                  >
                    Setup
                  </Link>
                  {selectedSummary?.homepage_url && (
                    <a
                      className="text-primary hover:underline"
                      href={selectedSummary.homepage_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Site
                    </a>
                  )}
                </div>
              </div>

              {certificateUrl.startsWith('http') ? (
                <p className="text-sm">
                  <a
                    className="font-medium text-primary hover:underline"
                    href={certificateUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open uploaded FSSAI certificate
                  </a>
                  <span className="ml-2 text-xs text-text-secondary">
                    (internal reference)
                  </span>
                </p>
              ) : (
                <p className="text-sm text-amber-800">
                  No certificate URL on file — ask restaurant to re-upload via
                  Master intake or add URL below.
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  Registration / Licence number
                  <input
                    className="mt-1 w-full rounded border border-black/15 px-3 py-2 font-mono"
                    value={fssaiLicense}
                    onChange={(e) => setFssaiLicense(e.target.value)}
                    placeholder="14-digit FSSAI number"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  Legal name of FBO
                  <input
                    className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  Premises address
                  <input
                    className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Issued on
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                    value={fssaiIssuedOn}
                    onChange={(e) => setFssaiIssuedOn(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Valid until (required)
                  <input
                    type="date"
                    required
                    className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                    value={fssaiValidUntil}
                    onChange={(e) => setFssaiValidUntil(e.target.value)}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  Certificate URL (optional)
                  <input
                    className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                    value={certificateUrl}
                    onChange={(e) => setCertificateUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveFssai()}
                  className="rounded border border-black/20 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Save FSSAI fields
                </button>
                {onboardingStatus === 'pending_review' && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onApprove()}
                      className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Approve go-live
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onReject()}
                      className="rounded border border-red-200 px-4 py-2 text-sm font-medium text-red-800 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
