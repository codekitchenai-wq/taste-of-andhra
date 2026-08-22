import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ENABLE_STARTER_ONBOARDING } from '@/constants/ARCHITECTURE_GATES'
import {
  GALLERY_SLOT_LABELS,
  WEBSITE_STARTER_MAX_CATEGORIES,
  WEBSITE_STARTER_MAX_MENU_ITEMS,
  type GallerySlotKind,
} from '@/constants/ONBOARDING'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/contexts/OrganizationContext'
import type { MenuCsvRow } from '@/utils/parseMenuCsv'
import { parseMenuCsv } from '@/utils/parseMenuCsv'
import {
  applyMenuDraftRows,
  getInviteByToken,
  loadStarterOrg,
  parseMenuWithAi,
  setGallerySlot,
  submitStarterForReview,
  updateStarterProfile,
  uploadOrgMedia,
} from '@/services/websiteStarterService'
import {
  CUISINE_SETTING_KEY,
  GOOGLE_MAPS_URL_SETTING_KEY,
  galleryFromSettings,
  isWebsiteStarterTrack,
} from '@/utils/websiteStarter'
import { isPlatformMasterUser } from '@/utils/platformMaster'

type DraftRow = {
  category: string
  name: string
  price: string
  isVeg: boolean
  description: string
}

function emptyDraft(): DraftRow {
  return {
    category: 'Starters',
    name: '',
    price: '',
    isVeg: true,
    description: '',
  }
}

export default function StarterSetupWizardPage() {
  const { token, orgId: orgIdParam } = useParams<{
    token?: string
    orgId?: string
  }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, login } = useAuth()
  const orgCtx = useOrganization()

  const orgFromQuery = searchParams.get('org')
  const [organizationId, setOrganizationId] = useState<string | null>(
    orgIdParam || orgFromQuery,
  )
  const [legalName, setLegalName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [weekdayHours, setWeekdayHours] = useState('')
  const [weekendHours, setWeekendHours] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [fssaiLicense, setFssaiLicense] = useState('')
  const [fssaiValidUntil, setFssaiValidUntil] = useState('')
  const [gallery, setGallery] = useState({
    front: null as string | null,
    interior: null as string | null,
    food: null as string | null,
  })
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [draftRows, setDraftRows] = useState<DraftRow[]>([emptyDraft()])
  const [csvText, setCsvText] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [invitePassword, setInvitePassword] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  const isMaster = isPlatformMasterUser(user)
  const canEdit = isAuthenticated && (isMaster || Boolean(user))

  useEffect(() => {
    if (!ENABLE_STARTER_ONBOARDING) return

    async function boot() {
      setError(null)
      if (token) {
        const invite = await getInviteByToken(token)
        if (!invite.success) {
          setError(invite.message)
          return
        }
        setOrganizationId(invite.data.organizationId)
        setLoginEmail(invite.data.ownerEmail || '')
        setInvitePassword(invite.data.temporaryPassword)
        if (invite.data.temporaryPassword) {
          setLoginPassword(invite.data.temporaryPassword)
        }
        hydrateFromOrg(invite.data.org)
        return
      }

      const id = orgIdParam || orgFromQuery || orgCtx.organizationId
      if (!id) return
      setOrganizationId(id)
      const loaded = await loadStarterOrg(id)
      if (loaded.success) hydrateFromOrg(loaded.data)
    }

    void boot()
  }, [token, orgIdParam, orgFromQuery, orgCtx.organizationId])

  function hydrateFromOrg(org: Record<string, unknown> | Partial<typeof orgCtx>) {
    const row = org as Record<string, unknown>
    setLegalName(String(row.legal_name ?? ''))
    setDisplayName(String(row.name ?? ''))
    setPhone(String(row.phone ?? ''))
    setEmail(String(row.email ?? ''))
    setAddress(String(row.address ?? ''))
    setTagline(String(row.tagline ?? ''))
    setDescription(String(row.description ?? ''))
    const settings =
      row.settings && typeof row.settings === 'object'
        ? (row.settings as Record<string, unknown>)
        : {}
    setWhatsappPhone(
      typeof settings.restaurant_whatsapp_phone === 'string'
        ? settings.restaurant_whatsapp_phone
        : '',
    )
    setGoogleMapsUrl(
      typeof settings[GOOGLE_MAPS_URL_SETTING_KEY] === 'string'
        ? String(settings[GOOGLE_MAPS_URL_SETTING_KEY])
        : '',
    )
    setCuisineType(
      typeof settings[CUISINE_SETTING_KEY] === 'string'
        ? String(settings[CUISINE_SETTING_KEY])
        : '',
    )
    const gallery = galleryFromSettings(settings)
    setGallery({
      front: gallery.front ?? null,
      interior: gallery.interior ?? null,
      food: gallery.food ?? null,
    })
    const hours =
      row.opening_hours && typeof row.opening_hours === 'object'
        ? (row.opening_hours as Record<string, unknown>)
        : {}
    setWeekdayHours(typeof hours.weekdays === 'string' ? hours.weekdays : '')
    setWeekendHours(typeof hours.weekends === 'string' ? hours.weekends : '')
    setFssaiLicense(String(row.fssai_license ?? ''))
    setFssaiValidUntil(
      row.fssai_valid_until
        ? String(row.fssai_valid_until).slice(0, 10)
        : '',
    )
    const branding =
      row.branding && typeof row.branding === 'object'
        ? (row.branding as Record<string, unknown>)
        : {}
    setLogoUrl(
      typeof branding.logo_url === 'string' ? branding.logo_url : null,
    )
  }

  const menuCsvRows: MenuCsvRow[] = useMemo(() => {
    return draftRows
      .filter((row) => row.name.trim() && row.price.trim())
      .map((row, index) => ({
        category: row.category.trim() || 'Menu',
        name: row.name.trim(),
        price: Number(row.price),
        isVeg: row.isVeg,
        spiceLevel: null,
        description: row.description.trim(),
        preparationTimeMinutes: null,
        isAvailable: true,
        isFeatured: false,
        displayOrder: index + 1,
        lineNumber: index + 1,
      }))
      .filter((row) => Number.isFinite(row.price))
  }, [draftRows])

  const uniqueCategoryCount = useMemo(() => {
    return new Set(
      menuCsvRows.map((row) => row.category.trim().toLowerCase() || 'menu'),
    ).size
  }, [menuCsvRows])

  const menuOverItemLimit =
    menuCsvRows.length > WEBSITE_STARTER_MAX_MENU_ITEMS
  const menuOverCategoryLimit =
    uniqueCategoryCount > WEBSITE_STARTER_MAX_CATEGORIES
  const canSaveMenu =
    menuCsvRows.length > 0 && !menuOverItemLimit && !menuOverCategoryLimit

  async function onLogin(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await login({ email: loginEmail, password: loginPassword })
    setBusy(false)
    if (!result.success) {
      setError(result.message || 'Login failed.')
    }
  }

  async function saveProfile() {
    if (!organizationId) return
    setBusy(true)
    setError(null)
    const result = await updateStarterProfile(organizationId, {
      displayName,
      phone,
      email,
      address,
      tagline,
      description,
      weekdayHours,
      weekendHours,
      googleMapsUrl,
      cuisineType,
      whatsappPhone,
      logoUrl: logoUrl || undefined,
      heroUrl: gallery.front || undefined,
      gallery,
      // FSSAI fields are Master-only — intentionally omitted
    })
    setBusy(false)
    if (!result.success) {
      setError(result.message)
      return
    }
    setMessage('Profile saved.')
  }

  async function onUploadGallery(kind: GallerySlotKind, file: File) {
    if (!organizationId) return
    setBusy(true)
    const uploaded = await uploadOrgMedia({
      organizationId,
      file,
      folder: 'gallery',
      slot: kind,
    })
    if (!uploaded.success) {
      setBusy(false)
      setError(uploaded.message)
      return
    }
    await setGallerySlot(organizationId, kind, uploaded.data)
    setGallery((prev) => ({ ...prev, [kind]: uploaded.data }))
    if (kind === 'front') {
      await updateStarterProfile(organizationId, { heroUrl: uploaded.data })
    }
    setBusy(false)
    setMessage(`${GALLERY_SLOT_LABELS[kind]} uploaded.`)
  }

  async function onUploadLogo(file: File) {
    if (!organizationId) return
    setBusy(true)
    const uploaded = await uploadOrgMedia({
      organizationId,
      file,
      folder: 'branding',
      slot: 'logo',
    })
    setBusy(false)
    if (!uploaded.success) {
      setError(uploaded.message)
      return
    }
    setLogoUrl(uploaded.data)
    await updateStarterProfile(organizationId, { logoUrl: uploaded.data })
  }

  async function onAiMenu(files: FileList | null) {
    if (!organizationId || !files?.length) return
    setBusy(true)
    setError(null)
    const urls: string[] = []
    for (const file of Array.from(files).slice(0, 6)) {
      const uploaded = await uploadOrgMedia({
        organizationId,
        file,
        folder: 'menu-imports',
        slot: 'menu',
      })
      if (uploaded.success) urls.push(uploaded.data)
    }
    if (!urls.length) {
      setBusy(false)
      setError('Could not upload menu images.')
      return
    }
    const parsed = await parseMenuWithAi({
      organizationId,
      sourcePaths: urls,
    })
    setBusy(false)
    if (!parsed.success) {
      setError(parsed.message)
      return
    }
    setDraftRows(
      parsed.data.rows.map((row) => ({
        category: row.category,
        name: row.name,
        price: String(row.price),
        isVeg: row.isVeg,
        description: row.description ?? '',
      })),
    )
    const count = parsed.data.rows.length
    if (count > WEBSITE_STARTER_MAX_MENU_ITEMS) {
      setMessage(
        `Extracted ${count} items. Review all below, then remove extras so you have ${WEBSITE_STARTER_MAX_MENU_ITEMS} or fewer before saving.`,
      )
      setError(
        `Over the Website Starter limit (${WEBSITE_STARTER_MAX_MENU_ITEMS} items). Remove ${count - WEBSITE_STARTER_MAX_MENU_ITEMS} item(s) to enable save.`,
      )
    } else {
      setMessage(
        `Extracted ${count} items. Review names, prices, categories, and descriptions, then save.`,
      )
    }
    setStep(3)
  }

  function loadFromCsv() {
    const parsed = parseMenuCsv(csvText)
    if (!parsed.rows.length) {
      setError(parsed.errors[0] || 'No valid CSV rows.')
      return
    }
    setDraftRows(
      parsed.rows.map((row) => ({
        category: row.category,
        name: row.name,
        price: String(row.price),
        isVeg: row.isVeg,
        description: row.description,
      })),
    )
    const count = parsed.rows.length
    if (count > WEBSITE_STARTER_MAX_MENU_ITEMS) {
      setMessage(
        `Loaded ${count} CSV rows. Trim to ${WEBSITE_STARTER_MAX_MENU_ITEMS} or fewer before saving.`,
      )
    } else {
      setMessage(`Loaded ${count} rows from CSV.`)
    }
  }

  async function applyMenu() {
    if (!organizationId) return
    if (!menuCsvRows.length) {
      setError('Add at least one menu item.')
      return
    }
    if (!canSaveMenu) {
      if (menuOverItemLimit) {
        setError(
          `Save needs ${WEBSITE_STARTER_MAX_MENU_ITEMS} items or fewer (you have ${menuCsvRows.length}).`,
        )
      } else if (menuOverCategoryLimit) {
        setError(
          `Save needs ${WEBSITE_STARTER_MAX_CATEGORIES} categories or fewer (you have ${uniqueCategoryCount}).`,
        )
      }
      return
    }
    setBusy(true)
    const result = await applyMenuDraftRows(organizationId, menuCsvRows, {
      maxItems: WEBSITE_STARTER_MAX_MENU_ITEMS,
      maxCategories: WEBSITE_STARTER_MAX_CATEGORIES,
      publishImmediately: false,
    })
    setBusy(false)
    if (!result.success) {
      setError(result.message)
      return
    }
    setError(null)
    setMessage(
      `Imported ${result.data.dishesCreated} dishes in ${result.data.categoriesCreated} new categories. Edit anytime in Admin → Dishes.`,
    )
  }

  async function submitReview() {
    if (!organizationId) return
    await saveProfile()
    setBusy(true)
    const result = await submitStarterForReview(organizationId)
    setBusy(false)
    if (!result.success) {
      setError(result.message)
      return
    }
    setMessage('Submitted for Master review. Your site stays gated until approved.')
    setStep(4)
  }

  if (!ENABLE_STARTER_ONBOARDING) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p>Starter setup is disabled.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Restaurant setup</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Complete profile, 3 photos, and up to {WEBSITE_STARTER_MAX_MENU_ITEMS}{' '}
          menu items / {WEBSITE_STARTER_MAX_CATEGORIES} categories. Legal name from FSSAI cannot be changed.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </div>
      )}

      {!canEdit && (
        <form
          onSubmit={onLogin}
          className="space-y-3 rounded border border-black/10 bg-surface p-4"
        >
          <h2 className="font-semibold">Sign in to continue</h2>
          {invitePassword && (
            <p className="text-xs text-text-secondary">
              Temporary password from your invite is prefilled — change it after
              login in account settings.
            </p>
          )}
          <label className="block text-sm">
            Email
            <input
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded border border-black/15 px-3 py-2"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Sign in
          </button>
        </form>
      )}

      {canEdit && organizationId && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStep(n)}
                className={`rounded px-3 py-1 ${
                  step === n
                    ? 'bg-primary text-white'
                    : 'border border-black/15'
                }`}
              >
                Step {n}
              </button>
            ))}
          </div>

          {step === 1 && (
            <section className="space-y-3 rounded border border-black/10 p-4">
              <h2 className="font-heading text-lg font-semibold">Profile</h2>
              <label className="block text-sm">
                Legal name (FSSAI) — read only
                <input
                  readOnly
                  className="mt-1 w-full rounded border border-black/10 bg-black/5 px-3 py-2"
                  value={legalName || 'Not set — contact DirectApp if wrong'}
                />
              </label>
              <label className="block text-sm">
                Store / display name
                <input
                  className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  Phone
                  <input
                    className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  WhatsApp
                  <input
                    className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Email
                  <input
                    className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Cuisine
                  <input
                    className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                  />
                </label>
              </div>
              <label className="block text-sm">
                Address
                <input
                  className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Google Maps link
                <input
                  className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Tagline
                <input
                  className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                About
                <textarea
                  className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  Weekday hours
                  <input
                    className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                    value={weekdayHours}
                    onChange={(e) => setWeekdayHours(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Weekend hours
                  <input
                    className="mt-1 w-full rounded border border-black/15 px-3 py-2"
                    value={weekendHours}
                    onChange={(e) => setWeekendHours(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  FSSAI number (Master only)
                  <input
                    readOnly
                    className="mt-1 w-full rounded border border-black/10 bg-black/5 px-3 py-2 font-mono"
                    value={fssaiLicense || 'Set by DirectApp Master'}
                  />
                </label>
                <label className="block text-sm">
                  FSSAI valid until (Master only)
                  <input
                    readOnly
                    className="mt-1 w-full rounded border border-black/10 bg-black/5 px-3 py-2"
                    value={fssaiValidUntil || 'Set by DirectApp Master'}
                  />
                </label>
              </div>
              <p className="text-xs text-text-secondary">
                Licence details are not shown on your public website. To correct
                them, ask DirectApp Master — they update fields in Approvals
                after reviewing your certificate.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveProfile().then(() => setStep(2))}
                className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Save &amp; continue
              </button>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4 rounded border border-black/10 p-4">
              <h2 className="font-heading text-lg font-semibold">
                Photos (3 slots)
              </h2>
              <p className="text-sm text-text-secondary">
                Upload from your phone (including images from WhatsApp). Reps can
                upload on behalf of the restaurant.
              </p>
              <label className="block text-sm">
                Logo
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void onUploadLogo(file)
                  }}
                />
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="mt-2 h-16 w-16 rounded object-cover"
                  />
                )}
              </label>
              {(Object.keys(GALLERY_SLOT_LABELS) as GallerySlotKind[]).map(
                (kind) => (
                  <label key={kind} className="block text-sm">
                    {GALLERY_SLOT_LABELS[kind]}
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-1 block w-full"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void onUploadGallery(kind, file)
                      }}
                    />
                    {gallery[kind] && (
                      <img
                        src={gallery[kind]!}
                        alt={kind}
                        className="mt-2 h-28 w-full max-w-xs rounded object-cover"
                      />
                    )}
                  </label>
                ),
              )}
              <button
                type="button"
                className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setStep(3)}
              >
                Continue to menu
              </button>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4 rounded border border-black/10 p-4">
              <h2 className="font-heading text-lg font-semibold">
                Menu (max {WEBSITE_STARTER_MAX_MENU_ITEMS} items ·{' '}
                {WEBSITE_STARTER_MAX_CATEGORIES} categories)
              </h2>
              <p className="text-sm text-text-secondary">
                Upload a menu photo for Gemini Flash extract. All items appear
                below for review — add a description per dish if you want. Save
                only works at {WEBSITE_STARTER_MAX_MENU_ITEMS} items or fewer and{' '}
                {WEBSITE_STARTER_MAX_CATEGORIES} categories or fewer.
              </p>
              <p className="text-sm font-medium">
                Ready rows: {menuCsvRows.length}/{WEBSITE_STARTER_MAX_MENU_ITEMS}{' '}
                · Categories: {uniqueCategoryCount}/
                {WEBSITE_STARTER_MAX_CATEGORIES}
                {menuOverItemLimit || menuOverCategoryLimit
                  ? ' — trim to enable save'
                  : ''}
              </p>
              <label className="block text-sm">
                Upload menu photo/PDF for AI
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="mt-1 block w-full"
                  onChange={(e) => void onAiMenu(e.target.files)}
                />
              </label>
              <label className="block text-sm">
                Or paste menu CSV
                <textarea
                  className="mt-1 w-full rounded border border-black/15 px-3 py-2 font-mono text-xs"
                  rows={5}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="category,name,price,is_veg,..."
                />
              </label>
              <button
                type="button"
                className="rounded border border-black/15 px-3 py-1.5 text-sm"
                onClick={loadFromCsv}
              >
                Load CSV into editor
              </button>

              <div className="space-y-3">
                {draftRows.map((row, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded border border-black/10 p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-6">
                      <input
                        className="rounded border border-black/15 px-2 py-1 text-sm sm:col-span-1"
                        placeholder="Category"
                        value={row.category}
                        onChange={(e) => {
                          const next = [...draftRows]
                          next[index] = { ...row, category: e.target.value }
                          setDraftRows(next)
                        }}
                      />
                      <input
                        className="rounded border border-black/15 px-2 py-1 text-sm sm:col-span-2"
                        placeholder="Item name"
                        value={row.name}
                        onChange={(e) => {
                          const next = [...draftRows]
                          next[index] = { ...row, name: e.target.value }
                          setDraftRows(next)
                        }}
                      />
                      <input
                        className="rounded border border-black/15 px-2 py-1 text-sm"
                        placeholder="Price"
                        value={row.price}
                        onChange={(e) => {
                          const next = [...draftRows]
                          next[index] = { ...row, price: e.target.value }
                          setDraftRows(next)
                        }}
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={row.isVeg}
                          onChange={(e) => {
                            const next = [...draftRows]
                            next[index] = { ...row, isVeg: e.target.checked }
                            setDraftRows(next)
                          }}
                        />
                        Veg
                      </label>
                      <button
                        type="button"
                        className="text-xs text-red-700"
                        onClick={() =>
                          setDraftRows(draftRows.filter((_, i) => i !== index))
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      className="w-full rounded border border-black/15 px-2 py-1 text-sm"
                      rows={2}
                      placeholder="Description (optional)"
                      value={row.description}
                      onChange={(e) => {
                        const next = [...draftRows]
                        next[index] = { ...row, description: e.target.value }
                        setDraftRows(next)
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-black/15 px-3 py-1.5 text-sm"
                  disabled={draftRows.length >= WEBSITE_STARTER_MAX_MENU_ITEMS}
                  onClick={() => setDraftRows([...draftRows, emptyDraft()])}
                >
                  Add row
                </button>
                <button
                  type="button"
                  disabled={busy || !canSaveMenu}
                  className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void applyMenu()}
                >
                  Apply menu to catalog
                </button>
                <Link
                  to={ROUTES.ADMIN.DISHES}
                  className="rounded border border-black/15 px-3 py-1.5 text-sm"
                >
                  Open Admin Dishes
                </Link>
              </div>
              {!canSaveMenu && menuCsvRows.length > 0 && (
                <p className="text-sm text-amber-800">
                  {menuOverItemLimit
                    ? `Remove ${menuCsvRows.length - WEBSITE_STARTER_MAX_MENU_ITEMS} item(s) to save.`
                    : menuOverCategoryLimit
                      ? `Reduce to ${WEBSITE_STARTER_MAX_CATEGORIES} categories or fewer to save.`
                      : null}
                </p>
              )}
              <button
                type="button"
                className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setStep(4)}
              >
                Continue
              </button>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-3 rounded border border-black/10 p-4">
              <h2 className="font-heading text-lg font-semibold">
                Submit for go-live
              </h2>
              <p className="text-sm text-text-secondary">
                Master will review compliance, photos, and menu before the
                public site goes live. FSSAI licence numbers stay internal.
              </p>
              <button
                type="button"
                disabled={busy}
                className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void submitReview()}
              >
                Request go-live review
              </button>
              <button
                type="button"
                className="ml-2 text-sm text-primary hover:underline"
                onClick={() => navigate(ROUTES.ADMIN.STARTER_TOOLS)}
              >
                Starter tools (QR, share, SEO)
              </button>
            </section>
          )}
        </>
      )}
    </div>
  )
}

/** Narrow helper for admin setup entry when org is website_starter. */
export function isStarterSetupRelevant(
  settings: Record<string, unknown> | null | undefined,
) {
  return isWebsiteStarterTrack(settings)
}
