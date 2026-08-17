import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import {
  DEFAULT_WHATSAPP_ENABLED_STATUSES,
  META_SANDBOX_WHATSAPP_CONNECT_DEFAULTS,
  MOCK_WHATSAPP_CONNECT_DEFAULTS,
  WHATSAPP_TOGGLEABLE_STATUSES,
} from '@/constants/WHATSAPP'
import * as whatsappService from '@/services/whatsappService'
import { supabase } from '@/services/supabaseClient'
import type { OrderStatus } from '@/types/enums'
import type {
  OrganizationWhatsAppConfig,
  WhatsAppEnabledStatuses,
  WhatsAppProvider,
} from '@/types/WhatsApp'
import {
  mergeWhatsAppConnectDraft,
  readWhatsAppConnectDraft,
  writeWhatsAppConnectDraft,
  type WhatsAppConnectDraft,
} from '@/utils/whatsappConnectDraft'

const PROVIDER_OPTIONS: { value: WhatsAppProvider; label: string }[] = [
  { value: 'meta_cloud', label: 'Meta Cloud API' },
  { value: 'bsp_gupshup', label: 'BSP · Gupshup' },
  { value: 'bsp_interakt', label: 'BSP · Interakt' },
  { value: 'bsp_other', label: 'BSP · Other' },
]

function buildDefaultDraft(): WhatsAppConnectDraft {
  const saved = readWhatsAppConnectDraft()
  const base: WhatsAppConnectDraft = {
    provider: META_SANDBOX_WHATSAPP_CONNECT_DEFAULTS.provider,
    displayPhone: META_SANDBOX_WHATSAPP_CONNECT_DEFAULTS.displayPhone,
    wabaId: META_SANDBOX_WHATSAPP_CONNECT_DEFAULTS.wabaId,
    phoneNumberId: META_SANDBOX_WHATSAPP_CONNECT_DEFAULTS.phoneNumberId,
    accessToken: saved?.accessToken ?? '',
    verifyToken: saved?.verifyToken ?? '',
    testPhone: saved?.testPhone ?? '',
    enabledStatuses: { ...DEFAULT_WHATSAPP_ENABLED_STATUSES },
  }
  return mergeWhatsAppConnectDraft(base, saved)
}

function draftFromConfig(
  row: OrganizationWhatsAppConfig,
  saved: Partial<WhatsAppConnectDraft> | null,
): WhatsAppConnectDraft {
  const base: WhatsAppConnectDraft = {
    provider: row.provider,
    displayPhone:
      row.display_phone_number ??
      META_SANDBOX_WHATSAPP_CONNECT_DEFAULTS.displayPhone,
    wabaId: row.waba_id ?? META_SANDBOX_WHATSAPP_CONNECT_DEFAULTS.wabaId,
    phoneNumberId:
      row.phone_number_id ??
      META_SANDBOX_WHATSAPP_CONNECT_DEFAULTS.phoneNumberId,
    accessToken: row.has_access_token ? '' : (saved?.accessToken ?? ''),
    verifyToken: row.webhook_verify_token ?? saved?.verifyToken ?? '',
    testPhone: saved?.testPhone ?? '',
    enabledStatuses: {
      ...DEFAULT_WHATSAPP_ENABLED_STATUSES,
      ...row.enabled_statuses,
    },
  }
  const merged = mergeWhatsAppConnectDraft(base, saved)
  return {
    ...merged,
    enabledStatuses: base.enabledStatuses,
  }
}

function statusBadgeClass(status: OrganizationWhatsAppConfig['connection_status']) {
  switch (status) {
    case 'connected':
      return 'text-success'
    case 'pending_review':
      return 'text-amber-700'
    case 'error':
      return 'text-error'
    default:
      return 'text-text-secondary'
  }
}

export function WhatsAppSettingsPanel() {
  const [config, setConfig] = useState<OrganizationWhatsAppConfig | null>(null)
  const [entitled, setEntitled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingStatuses, setIsSavingStatuses] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const initialDraft = buildDefaultDraft()
  const [enabledStatuses, setEnabledStatuses] = useState<WhatsAppEnabledStatuses>(
    initialDraft.enabledStatuses,
  )
  const [provider, setProvider] = useState<WhatsAppProvider>(initialDraft.provider)
  const [wabaId, setWabaId] = useState(initialDraft.wabaId)
  const [phoneNumberId, setPhoneNumberId] = useState(initialDraft.phoneNumberId)
  const [displayPhone, setDisplayPhone] = useState(initialDraft.displayPhone)
  const [accessToken, setAccessToken] = useState(initialDraft.accessToken)
  const [verifyToken, setVerifyToken] = useState(initialDraft.verifyToken)
  const [testPhone, setTestPhone] = useState(initialDraft.testPhone)

  const persistDraft = (overrides?: Partial<WhatsAppConnectDraft>) => {
    writeWhatsAppConnectDraft({
      provider,
      displayPhone,
      wabaId,
      phoneNumberId,
      accessToken,
      verifyToken,
      testPhone,
      enabledStatuses,
      ...overrides,
    })
  }

  const applyDraft = (draft: WhatsAppConnectDraft) => {
    setProvider(draft.provider)
    setDisplayPhone(draft.displayPhone)
    setWabaId(draft.wabaId)
    setPhoneNumberId(draft.phoneNumberId)
    setAccessToken(draft.accessToken)
    setVerifyToken(draft.verifyToken)
    setTestPhone(draft.testPhone)
    setEnabledStatuses(draft.enabledStatuses)
    writeWhatsAppConnectDraft(draft)
  }

  const applyMetaSandboxDefaults = () => {
    const saved = readWhatsAppConnectDraft()
    applyDraft(
      mergeWhatsAppConnectDraft(buildDefaultDraft(), {
        ...META_SANDBOX_WHATSAPP_CONNECT_DEFAULTS,
        accessToken: saved?.accessToken ?? '',
        verifyToken: saved?.verifyToken ?? '',
        testPhone: saved?.testPhone ?? '',
        enabledStatuses: { ...DEFAULT_WHATSAPP_ENABLED_STATUSES },
      }),
    )
    toast.success(
      'Meta sandbox values filled. Paste your access token, then Connect / save.',
    )
  }

  const applyMockTestDefaults = () => {
    applyDraft({
      provider: MOCK_WHATSAPP_CONNECT_DEFAULTS.provider,
      displayPhone: MOCK_WHATSAPP_CONNECT_DEFAULTS.displayPhone,
      wabaId: MOCK_WHATSAPP_CONNECT_DEFAULTS.wabaId,
      phoneNumberId: MOCK_WHATSAPP_CONNECT_DEFAULTS.phoneNumberId,
      accessToken: MOCK_WHATSAPP_CONNECT_DEFAULTS.accessToken,
      verifyToken: '',
      testPhone,
      enabledStatuses: { ...DEFAULT_WHATSAPP_ENABLED_STATUSES },
    })
    toast.success(
      'Mock test values filled. Click Connect / save, then Save status preferences.',
    )
  }

  const load = async () => {
    setIsLoading(true)
    const savedDraft = readWhatsAppConnectDraft()
    const [featureOn, configResult] = await Promise.all([
      whatsappService.hasWhatsAppNotifications(),
      whatsappService.getWhatsAppConfig(),
    ])
    setEntitled(featureOn)

    if (configResult.success) {
      setConfig(configResult.data)
      if (configResult.data) {
        applyDraft(draftFromConfig(configResult.data, savedDraft))
      } else {
        applyDraft(mergeWhatsAppConnectDraft(buildDefaultDraft(), savedDraft))
      }
    }

    setIsLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, [])

  useEffect(() => {
    if (isLoading) return
    persistDraft()
  }, [
    isLoading,
    provider,
    displayPhone,
    wabaId,
    phoneNumberId,
    accessToken,
    verifyToken,
    testPhone,
    enabledStatuses,
  ])

  const handleToggleStatus = (status: OrderStatus) => {
    setEnabledStatuses((prev) => ({ ...prev, [status]: !prev[status] }))
  }

  const handleSaveStatuses = async () => {
    if (!config) {
      toast.error(
        'Connect WhatsApp first (paste Meta access token → Connect / save), then save status preferences.',
      )
      return
    }
    setIsSavingStatuses(true)
    const result = await whatsappService.saveWhatsAppConfig({
      enabledStatuses,
    })
    setIsSavingStatuses(false)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    setConfig(result.data)
    setEnabledStatuses({
      ...DEFAULT_WHATSAPP_ENABLED_STATUSES,
      ...result.data.enabled_statuses,
    })
    persistDraft({ enabledStatuses: result.data.enabled_statuses })
    toast.success('WhatsApp status preferences saved')
  }

  const handleConnect = async () => {
    if (!wabaId.trim() || !phoneNumberId.trim() || !displayPhone.trim()) {
      toast.error('WABA ID, Phone Number ID, and display number are required')
      return
    }
    if (!accessToken.trim() && !config?.has_access_token) {
      toast.error(
        'Paste your Meta access token, then click Connect / save.',
      )
      return
    }

    setIsConnecting(true)

    if (accessToken.trim()) {
      const result = await whatsappService.connectWhatsAppCredentials({
        provider,
        wabaId: wabaId.trim(),
        phoneNumberId: phoneNumberId.trim(),
        displayPhoneNumber: displayPhone.trim(),
        accessToken: accessToken.trim(),
        webhookVerifyToken: verifyToken.trim() || undefined,
      })
      setIsConnecting(false)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      setConfig(result.data)
      setAccessToken('')
      persistDraft({ accessToken: '' })
      toast.success('WhatsApp connected')
      return
    }

    // Token already saved server-side — update public fields only.
    const result = await whatsappService.saveWhatsAppConfig({
      provider,
      wabaId: wabaId.trim(),
      phoneNumberId: phoneNumberId.trim(),
      displayPhoneNumber: displayPhone.trim(),
      connectionStatus: 'connected',
    })
    setIsConnecting(false)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    setConfig(result.data)
    toast.success('WhatsApp settings updated')
  }

  const handleDisconnect = async () => {
    setIsConnecting(true)
    const result = await whatsappService.disconnectWhatsApp()
    setIsConnecting(false)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    setConfig(result.data)
    setAccessToken('')
    persistDraft({ accessToken: '' })
    toast.success('WhatsApp disconnected')
  }

  const handleTest = async () => {
    if (!testPhone.trim()) {
      toast.error('Enter a phone number to receive the test template')
      return
    }
    setIsTesting(true)
    const result = await whatsappService.sendWhatsAppTestMessage(testPhone.trim())
    setIsTesting(false)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success('Test message queued / sent')
  }

  const handleEmbeddedSignup = async () => {
    const { data, error } = await supabase.functions.invoke(
      'whatsapp-embedded-signup',
      {
        body: {
          organizationId: config?.organization_id ?? DEFAULT_ORGANIZATION_ID,
        },
      },
    )

    if (error) {
      toast.error(error.message)
      return
    }

    const payload = data as { message?: string; ready?: boolean } | null
    toast(
      payload?.message ??
        'Embedded Signup will open here once Meta Tech Provider credentials are set.',
    )
  }

  if (isLoading) {
    return (
      <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <h3 className="text-lg font-semibold text-text-primary">WhatsApp</h3>
        <p className="mt-2 text-sm text-text-secondary">Loading…</p>
      </section>
    )
  }

  return (
    <section className="space-y-6 rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">WhatsApp</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Share order status updates from your restaurant WhatsApp Business
          number. Customers must opt in at checkout; they can reply STOP to
          unsubscribe. When the WhatsApp ordering add-on is enabled, customers
          can also text Hi / Menu to browse categories and dishes in chat.
        </p>
        <p className="mt-2 text-xs text-text-secondary">
          Meta sandbox IDs are prefilled for TOAapp. Your access token is kept
          in this browser until you connect. Mock mode does not deliver real
          WhatsApp — see{' '}
          <code className="font-mono">docs/WHATSAPP_META_SETUP.md</code>.
        </p>
      </div>

      {!entitled && (
        <p className="rounded-[var(--radius-button)] bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The <code className="font-mono text-xs">whatsapp_notifications</code>{' '}
          add-on is not enabled for this restaurant. Ask the platform Superuser
          to grant it.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-text-secondary">Connection</span>
        <span
          className={`font-medium ${statusBadgeClass(
            config?.connection_status ?? 'disconnected',
          )}`}
        >
          {config?.connection_status ?? 'disconnected'}
          {config?.has_access_token ? ' · token saved' : ''}
        </span>
        {config?.display_phone_number && (
          <span className="font-mono text-xs text-text-secondary">
            {config.display_phone_number}
          </span>
        )}
        {config?.last_error && (
          <span className="text-xs text-error">{config.last_error}</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-text-secondary">Provider</span>
          <select
            className="w-full rounded-[var(--radius-button)] border border-black/10 bg-background px-3 py-2"
            value={provider}
            onChange={(event) =>
              setProvider(event.target.value as WhatsAppProvider)
            }
            disabled={!entitled}
          >
            {PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Display phone number"
          value={displayPhone}
          onChange={(event) => setDisplayPhone(event.target.value)}
          placeholder="+15551997138"
          disabled={!entitled}
        />
        <Input
          label="WABA ID"
          value={wabaId}
          onChange={(event) => setWabaId(event.target.value)}
          disabled={!entitled}
        />
        <Input
          label="Phone Number ID"
          value={phoneNumberId}
          onChange={(event) => setPhoneNumberId(event.target.value)}
          disabled={!entitled}
        />
        <Input
          label="Access token"
          type="password"
          value={accessToken}
          onChange={(event) => setAccessToken(event.target.value)}
          placeholder={
            config?.has_access_token
              ? '•••••••• (leave blank to keep saved token)'
              : 'Paste Meta access token from Step 1'
          }
          disabled={!entitled}
        />
        <Input
          label="Webhook verify token (optional)"
          value={verifyToken}
          onChange={(event) => setVerifyToken(event.target.value)}
          disabled={!entitled}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={!entitled || isConnecting}
          onClick={() => void handleConnect()}
        >
          {isConnecting ? 'Saving…' : 'Connect / save'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!entitled || isConnecting}
          onClick={applyMetaSandboxDefaults}
        >
          Fill Meta sandbox values
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!entitled || isConnecting}
          onClick={applyMockTestDefaults}
        >
          Fill mock test values
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!entitled || isConnecting || !config}
          onClick={() => void handleDisconnect()}
        >
          Disconnect
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!entitled}
          onClick={() => void handleEmbeddedSignup()}
        >
          Embedded Signup
        </Button>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-text-primary">
          Statuses to share
        </h4>
        <p className="mt-1 text-xs text-text-secondary">
          Only ticked statuses send WhatsApp for this restaurant. Automatic
          customer opt-in is on for Taste of Andhra only. Save after you
          change them. Customer login also needs an Authentication template
          named{' '}
          <code className="font-mono">login_otp</code> (copy-code / OTP) in
          WhatsApp Manager — no TRAI DLT registration.
        </p>
        <ul className="mt-3 space-y-2">
          {WHATSAPP_TOGGLEABLE_STATUSES.map((status) => (
            <li key={status}>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-text-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={Boolean(enabledStatuses[status])}
                  disabled={!entitled}
                  onChange={() => handleToggleStatus(status)}
                />
                {ORDER_STATUS[status]}
              </label>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          className="mt-3"
          disabled={!entitled || isSavingStatuses}
          onClick={() => void handleSaveStatuses()}
        >
          {isSavingStatuses ? 'Saving…' : 'Save status preferences'}
        </Button>
      </div>

      <div className="border-t border-black/5 pt-4">
        <h4 className="text-sm font-semibold text-text-primary">Send test</h4>
        <p className="mt-1 text-xs text-text-secondary">
          Queues the <code className="font-mono">order_confirmed</code> template
          to the recipient below. With a real Meta token, the message arrives on
          this recipient number (must be on Meta&apos;s allow list for test
          numbers).
        </p>
        <div className="mt-3 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="Recipient phone"
            value={testPhone}
            onChange={(event) => setTestPhone(event.target.value)}
            placeholder="+919342540612"
            disabled={!entitled}
          />
          <Button
            type="button"
            disabled={
              !entitled ||
              isTesting ||
              config?.connection_status !== 'connected'
            }
            onClick={() => void handleTest()}
            className="shrink-0"
          >
            {isTesting ? 'Sending…' : 'Send test'}
          </Button>
        </div>
      </div>
    </section>
  )
}
