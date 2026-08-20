import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ENABLE_STARTER_ONBOARDING,
  SHOW_FSSAI_EXTRACT_PATH,
} from '@/constants/ARCHITECTURE_GATES'
import { ROUTES } from '@/constants/ROUTES'
import {
  approveStarterGoLive,
  checkOrganizationSlugAvailable,
  findFssaiDuplicates,
  FSSAI_EXTRACT_PATH_LABELS,
  hashCertificateFile,
  intakeWebsiteStarter,
  listPendingStarterOrgs,
  parseFssaiWithAi,
  proposeAvailableSlug,
  rejectStarterGoLive,
  uploadIntakeCertificate,
  uploadOrgMedia,
  type FssaiDuplicateMatch,
  type FssaiExtractPath,
  type StarterIntakeResult,
  type StarterOrgSummary,
} from '@/services/websiteStarterService'
import { generateSlug } from '@/utils/slug'
import { proposeDisplayName, proposeSlugBase } from '@/utils/websiteStarter'

export default function MasterStarterIntakePage() {
  const [legalName, setLegalName] = useState('')
  const [preferredStoreName, setPreferredStoreName] = useState('')
  const [fssaiLicense, setFssaiLicense] = useState('')
  const [fssaiValidUntil, setFssaiValidUntil] = useState('')
  const [fssaiIssuedOn, setFssaiIssuedOn] = useState('')
  const [fssaiCertificateUrl, setFssaiCertificateUrl] = useState('')
  const [fssaiCertificateHash, setFssaiCertificateHash] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [addressFromFssai, setAddressFromFssai] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [allowDuplicateFssai, setAllowDuplicateFssai] = useState(false)
  const [duplicates, setDuplicates] = useState<FssaiDuplicateMatch[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<StarterIntakeResult | null>(null)
  const [pending, setPending] = useState<StarterOrgSummary[]>([])
  const [certFile, setCertFile] = useState<File | null>(null)
  const [certPreviewUrl, setCertPreviewUrl] = useState<string | null>(null)
  const [extractNote, setExtractNote] = useState<string | null>(null)
  const [extractPath, setExtractPath] = useState<FssaiExtractPath | null>(null)
  const [extractAttempts, setExtractAttempts] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  const previewSlug = useMemo(() => {
    const name = proposeDisplayName(legalName, preferredStoreName)
    return proposeSlugBase(name) || 'restaurant'
  }, [legalName, preferredStoreName])

  const homepagePreview = useMemo(() => {
    const s = slug.trim() || previewSlug
    return s ? `https://${s}.directapp.in` : ''
  }, [slug, previewSlug])

  const canAiExtract = Boolean(
    certFile ||
      (fssaiCertificateUrl.trim().startsWith('http') &&
        !fssaiCertificateUrl.includes(':\\') &&
        !fssaiCertificateUrl.startsWith('/')),
  )

  // Auto-propose slug from name until the user edits it
  useEffect(() => {
    if (slugTouched) return
    const name = proposeDisplayName(legalName, preferredStoreName)
    if (!name.trim()) {
      setSlug('')
      setSlugAvailable(null)
      return
    }
    let cancelled = false
    void proposeAvailableSlug(name, city).then((result) => {
      if (cancelled || slugTouched) return
      if (result.success) {
        setSlug(result.data)
        setSlugAvailable(true)
      } else {
        setSlug(proposeSlugBase(name))
        setSlugAvailable(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [legalName, preferredStoreName, city, slugTouched])

  // Live availability check when slug changes
  useEffect(() => {
    const candidate = generateSlug(slug)
    if (!candidate || candidate.length < 2) {
      setSlugAvailable(null)
      return
    }
    let cancelled = false
    setSlugChecking(true)
    const timer = window.setTimeout(() => {
      void checkOrganizationSlugAvailable(candidate).then((result) => {
        if (cancelled) return
        setSlugChecking(false)
        if (!result.success) {
          setSlugAvailable(null)
          return
        }
        if (result.data.slug !== candidate) setSlug(result.data.slug)
        setSlugAvailable(result.data.available)
      })
    }, 350)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [slug])

  async function refreshPending() {
    const result = await listPendingStarterOrgs()
    if (result.success) setPending(result.data)
  }

  useEffect(() => {
    void refreshPending()
  }, [])

  useEffect(() => {
    if (!certFile || !certFile.type.startsWith('image/')) {
      setCertPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(certFile)
    setCertPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [certFile])

  useEffect(() => {
    const license = fssaiLicense.trim()
    const hash = fssaiCertificateHash.trim()
    if (!license && !hash) {
      setDuplicates([])
      return
    }
    let cancelled = false
    void findFssaiDuplicates({ license, hash }).then((result) => {
      if (cancelled) return
      if (result.success) setDuplicates(result.data)
      else setDuplicates([])
    })
    return () => {
      cancelled = true
    }
  }, [fssaiLicense, fssaiCertificateHash])

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

  function clearCertificate() {
    setCertFile(null)
    setCertPreviewUrl(null)
    setFssaiCertificateUrl('')
    setFssaiCertificateHash('')
    setExtractNote(null)
    setExtractPath(null)
    setExtractAttempts([])
    setAllowDuplicateFssai(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  async function onSelectCert(
    file: File,
    options?: { autoExtract?: boolean },
  ) {
    setError(null)
    setExtractNote(null)
    setExtractPath(null)
    setExtractAttempts([])
    setCertFile(file)
    setAllowDuplicateFssai(false)
    if (fssaiCertificateUrl.includes(':\\') || fssaiCertificateUrl.startsWith('/Users')) {
      setFssaiCertificateUrl('')
    }
    try {
      const hash = await hashCertificateFile(file)
      setFssaiCertificateHash(hash)
    } catch {
      setFssaiCertificateHash('')
    }
    // Persist immediately so the certificate is kept for later reference
    const uploaded = await uploadIntakeCertificate(file)
    if (uploaded.success) {
      setFssaiCertificateUrl(uploaded.data)
    }
    if (options?.autoExtract) {
      await onAiExtract(file)
    }
  }

  async function onAiExtract(fileOverride?: File | null) {
    setBusy(true)
    setError(null)
    setExtractNote(null)
    setExtractPath(null)
    setExtractAttempts([])

    const file = fileOverride ?? certFile
    const httpsUrl =
      fssaiCertificateUrl.trim().startsWith('http') &&
      !fssaiCertificateUrl.includes(':\\')
        ? fssaiCertificateUrl.trim()
        : undefined

    const result = await parseFssaiWithAi({
      file,
      certificateUrl: httpsUrl,
    })
    setBusy(false)

    if (!result.success) {
      setError(result.message)
      return
    }

    const d = result.data
    if (d.legalName) {
      setLegalName(d.legalName)
      if (!preferredStoreName.trim()) setPreferredStoreName(d.legalName)
    }
    if (d.fssaiLicense) setFssaiLicense(d.fssaiLicense)
    if (d.fssaiValidUntil) {
      setFssaiValidUntil(String(d.fssaiValidUntil).slice(0, 10))
    }
    if (d.issuedOn) {
      setFssaiIssuedOn(String(d.issuedOn).slice(0, 10))
    }
    if (d.address) setAddressFromFssai(d.address)
    if (d.city) setCity(d.city)
    else if (d.address && !city.trim()) {
      const parts = d.address.split(',').map((p) => p.trim())
      const maybeCity = parts[parts.length - 2] || parts[parts.length - 1]
      if (maybeCity) setCity(maybeCity.replace(/\d{6}/g, '').trim())
    }
    if (d.state) setState(d.state)
    if (d.pincode) setPincode(String(d.pincode).replace(/\D/g, '').slice(0, 6))
    if (d.proprietorName) setOwnerName(d.proprietorName)
    if (d.phone) setOwnerPhone(String(d.phone).replace(/[^\d+]/g, ''))
    if (d.email) setOwnerEmail(d.email.trim())
    if (d.kindOfBusiness && !cuisineType.trim()) {
      setCuisineType(d.kindOfBusiness)
    }
    if (d.certificateUrl) setFssaiCertificateUrl(d.certificateUrl)

    setExtractPath(d.extractPath ?? null)
    setExtractAttempts(d.extractAttempts ?? [])

    const filled = [
      d.legalName,
      d.fssaiLicense,
      d.fssaiValidUntil,
      d.issuedOn,
      d.address,
      d.city,
      d.state,
      d.pincode,
      d.proprietorName,
      d.phone,
      d.email,
      d.kindOfBusiness,
    ].filter(Boolean).length

    const missingCore = [
      !d.legalName && 'legal name',
      !d.fssaiLicense && 'licence',
      !d.fssaiValidUntil && 'valid until',
    ].filter(Boolean) as string[]

    if (d.note) {
      setExtractNote(d.note)
    } else if (filled === 0) {
      setExtractNote(
        'No fields detected. Use a sharper full-page photo, FoSCoS PDF, or enter details manually.',
      )
    } else if (missingCore.length) {
      setExtractNote(
        `Filled ${filled} field(s). Still missing ${missingCore.join(', ')} — check those manually.`,
      )
    } else {
      setExtractNote(
        `Filled ${filled} field(s) from certificate — review before creating.`,
      )
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setCreated(null)

    const chosenSlug = generateSlug(slug || previewSlug)
    if (!chosenSlug) {
      setBusy(false)
      setError('Enter a URL slug for the restaurant site.')
      return
    }
    if (slugAvailable === false) {
      setBusy(false)
      setError(`Slug “${chosenSlug}” is already taken. Choose another.`)
      return
    }

    let hash = fssaiCertificateHash
    if (certFile && !hash) {
      try {
        hash = await hashCertificateFile(certFile)
        setFssaiCertificateHash(hash)
      } catch {
        hash = ''
      }
    }

    // Ensure certificate is stored before create (kept for later reference)
    let certificateUrl = fssaiCertificateUrl.trim()
    if (certFile && !certificateUrl.startsWith('http')) {
      const staged = await uploadIntakeCertificate(certFile)
      if (staged.success) {
        certificateUrl = staged.data
        setFssaiCertificateUrl(staged.data)
      }
    }

    const result = await intakeWebsiteStarter({
      legalName,
      preferredStoreName,
      slug: chosenSlug,
      fssaiLicense,
      fssaiValidUntil,
      fssaiIssuedOn,
      fssaiCertificateUrl: certificateUrl,
      fssaiCertificateHash: hash,
      city,
      state,
      pincode,
      ownerName,
      ownerEmail,
      ownerPhone,
      googleMapsUrl,
      cuisineType,
      addressFromFssai,
      allowDuplicateFssai,
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
        await intakePatchCert(result.data.organizationId, uploaded.data, hash)
      }
    }

    setCreated(result.data)
    setBusy(false)
    void refreshPending()
  }

  async function intakePatchCert(
    organizationId: string,
    url: string,
    hash: string,
  ) {
    const { updateStarterProfile } = await import(
      '@/services/websiteStarterService'
    )
    await updateStarterProfile(organizationId, {
      fssaiCertificateUrl: url,
      fssaiCertificateHash: hash || undefined,
    })
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
          Upload FSSAI, extract fields, create invite. Extra fields are optional.
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
          {fssaiCertificateUrl.startsWith('http') && (
            <p>
              Certificate kept:{' '}
              <a
                className="text-primary underline"
                href={fssaiCertificateUrl}
                target="_blank"
                rel="noreferrer"
              >
                open FSSAI file
              </a>
            </p>
          )}
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
          <div className="space-y-2 rounded border border-black/10 bg-black/[0.02] p-3 sm:col-span-2">
            <p className="text-sm font-medium">FSSAI certificate</p>
            <p className="text-xs text-text-secondary">
              <strong>Most accurate (recommended):</strong> upload the official
              FoSCoS PDF (Download from foscos.fssai.gov.in) — we read the PDF
              text for free. Phone photos of paper/screenshots are less reliable.
              On a phone you can still <strong>Take photo</strong>; review every
              field. Certificate file is saved for later reference.
            </p>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onSelectCert(file, { autoExtract: true })
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onSelectCert(file, { autoExtract: true })
              }}
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="min-h-11 rounded bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Choose FoSCoS PDF / file
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => cameraInputRef.current?.click()}
                className="min-h-11 rounded border border-black/20 bg-white px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                Take photo
              </button>
            </div>

            {certFile && (
              <div className="flex flex-wrap items-center gap-3 rounded border border-black/10 bg-white p-2 text-sm">
                {certPreviewUrl ? (
                  <img
                    src={certPreviewUrl}
                    alt="FSSAI preview"
                    className="h-20 w-20 rounded object-cover"
                  />
                ) : (
                  <span className="rounded bg-black/5 px-2 py-1 text-xs">PDF</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{certFile.name}</p>
                  <p className="text-xs text-text-secondary">
                    {(certFile.size / 1024).toFixed(0)} KB
                    {fssaiCertificateHash
                      ? ` · hash ${fssaiCertificateHash.slice(0, 10)}…`
                      : ''}
                  </p>
                  {fssaiCertificateUrl.startsWith('http') && (
                    <a
                      className="text-xs text-primary hover:underline"
                      href={fssaiCertificateUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Saved for reference — open certificate
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  className="rounded border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  onClick={clearCertificate}
                >
                  Remove file
                </button>
              </div>
            )}
            <label className="block text-sm">
              Or public https URL
              <input
                className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                value={
                  fssaiCertificateUrl.includes(':\\')
                    ? ''
                    : fssaiCertificateUrl
                }
                onChange={(e) => setFssaiCertificateUrl(e.target.value)}
                placeholder="https://…"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy || !canAiExtract}
                onClick={() => void onAiExtract()}
                className="rounded border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
              >
                {busy ? 'Extracting…' : 'Extract details'}
              </button>
              {!canAiExtract && (
                <span className="text-xs text-text-secondary">
                  Take a photo or choose a file first
                </span>
              )}
            </div>
            {extractNote && (
              <p
                className={
                  /could not|error|failed|found no|little text|manually/i.test(
                    extractNote,
                  )
                    ? 'text-xs text-amber-800'
                    : 'text-xs text-emerald-800'
                }
              >
                {extractNote}
              </p>
            )}
            {SHOW_FSSAI_EXTRACT_PATH &&
              (extractPath || extractAttempts.length > 0) && (
                <div className="rounded border border-dashed border-black/20 bg-black/[0.03] p-3 text-xs text-text-secondary">
                  <p className="font-semibold text-text-primary">
                    Extract path (debug)
                  </p>
                  <p className="mt-1">
                    Used:{' '}
                    <span className="font-medium text-text-primary">
                      {extractPath
                        ? FSSAI_EXTRACT_PATH_LABELS[extractPath]
                        : '—'}
                    </span>
                    {extractPath ? (
                      <code className="ml-1 text-[10px] opacity-70">
                        ({extractPath})
                      </code>
                    ) : null}
                  </p>
                  {extractAttempts.length > 0 && (
                    <ol className="mt-2 list-inside list-decimal space-y-0.5 font-mono text-[11px]">
                      {extractAttempts.map((step, index) => (
                        <li key={`${index}-${step}`}>{step}</li>
                      ))}
                    </ol>
                  )}
                  <p className="mt-2 text-[10px] opacity-70">
                    Hide later with VITE_SHOW_FSSAI_EXTRACT_PATH=false
                  </p>
                </div>
              )}
            {duplicates.length > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="font-medium">Possible duplicate FSSAI</p>
                <ul className="mt-1 list-inside list-disc text-xs">
                  {duplicates.map((d) => (
                    <li key={d.id}>
                      {d.name} ({d.slug}) — match: {d.match}
                      {d.fssai_license ? ` · ${d.fssai_license}` : ''}
                    </li>
                  ))}
                </ul>
                <label className="mt-2 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={allowDuplicateFssai}
                    onChange={(e) => setAllowDuplicateFssai(e.target.checked)}
                  />
                  Create anyway (override duplicate check)
                </label>
              </div>
            )}
          </div>

          <label className="block text-sm sm:col-span-2">
            Legal name (FSSAI) — locked after create
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Filled from certificate when possible"
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
            Proposed slug (editable)
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2 font-mono text-sm"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(generateSlug(e.target.value))
              }}
              placeholder="black-heaven-cafe"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="mt-1 block text-xs text-text-secondary">
              Site:{' '}
              <span className="font-mono">{homepagePreview || '—'}</span>
              {slugChecking && ' · checking…'}
              {!slugChecking && slugAvailable === true && (
                <span className="text-emerald-700"> · available</span>
              )}
              {!slugChecking && slugAvailable === false && (
                <span className="text-red-700"> · taken — change slug</span>
              )}
            </span>
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
            FSSAI issued on
            <input
              type="date"
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={fssaiIssuedOn}
              onChange={(e) => setFssaiIssuedOn(e.target.value)}
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
          <label className="block text-sm sm:col-span-2">
            Address (from FSSAI)
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={addressFromFssai}
              onChange={(e) => setAddressFromFssai(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            City
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            State
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            PIN code
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
            />
          </label>
          <label className="block text-sm">
            Proprietor / owner name
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Owner email
            <input
              type="email"
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="Optional — placeholder used if empty"
            />
          </label>
          <label className="block text-sm">
            Owner WhatsApp
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder="Optional — needed for WhatsApp invite"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            Kind of business / cuisine
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
              placeholder="From FSSAI Kind of Business, or cuisine type"
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
          disabled={busy || (duplicates.length > 0 && !allowDuplicateFssai) || slugAvailable === false}
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create Website Starter + invite'}
        </button>
        {duplicates.length > 0 && !allowDuplicateFssai && (
          <p className="text-xs text-amber-800">
            Enable “Create anyway” above to proceed with a duplicate FSSAI.
          </p>
        )}
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
                        to={ROUTES.MASTER.starterSetup(org.id)}
                      >
                        Continue setup
                      </Link>
                      {org.homepage_url && (
                        <a
                          className="text-primary hover:underline"
                          href={org.homepage_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Site
                        </a>
                      )}
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
