import { useEffect, useState } from 'react'
import { TENANT_TASTE_OF_ANDHRA } from '@/constants/DEMO_ACCOUNTS'
import * as whatsappService from '@/services/whatsappService'
import type {
  OrganizationWhatsAppConfig,
  WhatsAppMessageOutbox,
  WhatsAppOutboxStats,
} from '@/types/WhatsApp'

export function MasterWhatsAppObservability() {
  const [config, setConfig] = useState<OrganizationWhatsAppConfig | null>(null)
  const [stats, setStats] = useState<WhatsAppOutboxStats | null>(null)
  const [recent, setRecent] = useState<WhatsAppMessageOutbox[]>([])
  const [entitled, setEntitled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      const orgId = TENANT_TASTE_OF_ANDHRA.id
      const [featureOn, configResult, statsResult, recentResult] =
        await Promise.all([
          whatsappService.hasWhatsAppNotifications(orgId),
          whatsappService.getWhatsAppConfig(orgId),
          whatsappService.getOutboxStats(orgId),
          whatsappService.getRecentOutbox(orgId, 8),
        ])

      if (cancelled) return

      setEntitled(featureOn)
      if (!configResult.success) {
        setError(configResult.message)
      } else {
        setConfig(configResult.data)
      }
      if (statsResult.success) setStats(statsResult.data)
      if (recentResult.success) setRecent(recentResult.data)
      setIsLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="rounded-[var(--radius-card)] border border-black/10 bg-surface p-5">
      <h2 className="text-lg font-semibold">WhatsApp (tenant #1)</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Connection health and recent outbox for {TENANT_TASTE_OF_ANDHRA.name}.
        Opt-outs arrive when customers reply STOP.
      </p>

      {isLoading && (
        <p className="mt-4 text-sm text-text-secondary">Loading…</p>
      )}

      {error && (
        <p className="mt-4 text-sm text-error">
          {error} (apply the WhatsApp migration if tables are missing)
        </p>
      )}

      {!isLoading && !error && (
        <div className="mt-4 space-y-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-text-secondary">Add-on</dt>
              <dd className="font-medium">
                {entitled ? 'whatsapp_notifications enabled' : 'Not entitled'}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Connection</dt>
              <dd className="font-medium">
                {config?.connection_status ?? 'no config'}
                {config?.display_phone_number
                  ? ` · ${config.display_phone_number}`
                  : ''}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Token</dt>
              <dd className="font-medium">
                {config?.has_access_token ? 'Configured' : 'Missing'}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Last error</dt>
              <dd className="font-medium text-error">
                {config?.last_error ?? '—'}
              </dd>
            </div>
          </dl>

          {stats && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ['Queued', stats.queued],
                  ['Sent', stats.sent],
                  ['Delivered', stats.delivered],
                  ['Failed', stats.failed],
                  ['Skipped', stats.skipped],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[var(--radius-button)] bg-background px-3 py-2 text-center"
                >
                  <p className="text-xs text-text-secondary">{label}</p>
                  <p className="font-heading text-lg font-bold">{value}</p>
                </div>
              ))}
            </div>
          )}

          {recent.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="text-text-secondary">
                  <tr>
                    <th className="px-2 py-1">Status</th>
                    <th className="px-2 py-1">Order status</th>
                    <th className="px-2 py-1">Phone</th>
                    <th className="px-2 py-1">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id} className="border-t border-black/5">
                      <td className="px-2 py-1 font-mono">{row.status}</td>
                      <td className="px-2 py-1">{row.order_status}</td>
                      <td className="px-2 py-1 font-mono">
                        {row.recipient_phone ?? '—'}
                      </td>
                      <td className="max-w-[12rem] truncate px-2 py-1 text-error">
                        {row.last_error ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
