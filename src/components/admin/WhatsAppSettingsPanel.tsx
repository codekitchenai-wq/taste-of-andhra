import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import { WHATSAPP_TOGGLEABLE_STATUSES } from '@/constants/WHATSAPP'
import * as whatsappService from '@/services/whatsappService'
import { supabase } from '@/services/supabaseClient'
import type { OrderStatus } from '@/types/enums'
import type {
  OrganizationWhatsAppConfig,
  WhatsAppEnabledStatuses,
  WhatsAppProvider,
} from '@/types/WhatsApp'

const PROVIDER_OPTIONS: { value: WhatsAppProvider; label: string }[] = [
  { value: 'meta_cloud', label: 'Meta Cloud API' },
  { value: 'bsp_gupshup', label: 'BSP · Gupshup' },
  { value: 'bsp_interakt', label: 'BSP · Interakt' },
  { value: 'bsp_other', label: 'BSP · Other' },
]

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
  const [enabledStatuses, setEnabledStatuses] =
    useState<WhatsAppEnabledStatuses | null>(null)

  const [provider, setProvider] = useState<WhatsAppProvider>('meta_cloud')
  const [wabaId, setWabaId] = useState('')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [displayPhone, setDisplayPhone] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [testPhone, setTestPhone] = useState('')

  const load = async () => {
    setIsLoading(true)
    const [featureOn, configResult] = await Promise.all([
      whatsappService.hasWhatsAppNotifications(),
      whatsappService.getWhatsAppConfig(),
    ])
    setEntitled(featureOn)
    if (configResult.success) {
      setConfig(configResult.data)
      if (configResult.data) {
        setEnabledStatuses(configResult.data.enabled_statuses)
        setProvider(configResult.data.provider)
        setWabaId(configResult.data.waba_id ?? '')
        setPhoneNumberId(configResult.data.phone_number_id ?? '')
        setDisplayPhone(configResult.data.display_phone_number ?? '')
        setVerifyToken(configResult.data.webhook_verify_token ?? '')
      }
    }
    setIsLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const handleToggleStatus = (status: OrderStatus) => {
    setEnabledStatuses((prev) => {
      if (!prev) return prev
      return { ...prev, [status]: !prev[status] }
    })
  }

  const handleSaveStatuses = async () => {
    if (!enabledStatuses) return
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
    setEnabledStatuses(result.data.enabled_statuses)
    toast.success('WhatsApp status preferences saved')
  }

  const handleConnect = async () => {
    if (!wabaId.trim() || !phoneNumberId.trim() || !displayPhone.trim()) {
      toast.error('WABA ID, Phone Number ID, and display number are required')
      return
    }
    if (!accessToken.trim() && !config?.has_access_token) {
      toast.error('Access token is required for the first connection')
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
      toast.success('WhatsApp connected')
      return
    }

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
          Local mock (no Meta): set Phone Number ID to{' '}
          <code className="font-mono">mock_phone</code>, Access token to{' '}
          <code className="font-mono">mock</code>, any WABA / display values,
          then Connect. Use the{' '}
          <code className="font-mono">whatsapp-conversation-sim</code> edge
          function to drive Hi → View Menu → category → dish without calling
          Graph API. See{' '}
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
          placeholder="+91 98XXXXXXXX"
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
              ? '•••••••• (leave blank to keep)'
              : 'Meta permanent token'
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
          Only toggled statuses send an approved WhatsApp utility template.
        </p>
        <ul className="mt-3 space-y-2">
          {WHATSAPP_TOGGLEABLE_STATUSES.map((status) => (
            <li key={status}>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-text-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={Boolean(enabledStatuses?.[status])}
                  disabled={!entitled || !enabledStatuses}
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
          disabled={!entitled || isSavingStatuses || !enabledStatuses}
          onClick={() => void handleSaveStatuses()}
        >
          {isSavingStatuses ? 'Saving…' : 'Save status preferences'}
        </Button>
      </div>

      <div className="border-t border-black/5 pt-4">
        <h4 className="text-sm font-semibold text-text-primary">Send test</h4>
        <p className="mt-1 text-xs text-text-secondary">
          Sends the confirmed-order template to a number you control. Templates
          must already be approved on the WABA.
        </p>
        <div className="mt-3 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="Recipient phone"
            value={testPhone}
            onChange={(event) => setTestPhone(event.target.value)}
            placeholder="9876543210"
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
