import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/ROUTES'

/** Mirrors seeded feature catalog in SaaS migration. */
const FEATURES = [
  { key: 'menu', name: 'Menu', type: 'Base', enabled: true },
  { key: 'orders', name: 'Orders', type: 'Base', enabled: true },
  { key: 'customers', name: 'Customers', type: 'Base', enabled: true },
  { key: 'offers', name: 'Offers', type: 'Base', enabled: true },
  { key: 'reports', name: 'Reports', type: 'Base', enabled: true },
  { key: 'settings', name: 'Settings', type: 'Base', enabled: true },
  { key: 'delivery_own', name: 'Own delivery', type: 'Base', enabled: true },
  { key: 'branches', name: 'Multi-branch', type: 'Add-on', enabled: true },
  { key: 'qr_tables', name: 'QR tables', type: 'Add-on', enabled: true },
  {
    key: 'party_inquiries',
    name: 'Party inquiries',
    type: 'Add-on',
    enabled: true,
  },
  {
    key: 'delivery_pidge',
    name: 'Pidge delivery',
    type: 'Add-on',
    enabled: true,
  },
  { key: 'loyalty', name: 'Loyalty', type: 'Add-on', enabled: false },
] as const

export default function MasterFeaturesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Feature catalog</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Coarse modules available to restaurant tenants. Base features are on
          by default for active subscribers. Add-ons are granted per tenant
          (Taste of Andhra pilot grants shown below). Live toggle UI will write
          to <code className="rounded bg-black/5 px-1">organization_entitlements</code>{' '}
          after the SaaS migration is applied.
        </p>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-black/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-black/5 text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="px-3 py-2">Key</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Taste of Andhra</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature) => (
              <tr key={feature.key} className="border-t border-black/5">
                <td className="px-3 py-2 font-mono text-xs">{feature.key}</td>
                <td className="px-3 py-2">{feature.name}</td>
                <td className="px-3 py-2">{feature.type}</td>
                <td className="px-3 py-2">
                  {feature.enabled ? 'Enabled' : 'Locked'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-text-secondary">
        <Link to={ROUTES.MASTER.TENANTS} className="text-primary hover:underline">
          View tenants & persona logins
        </Link>
      </p>
    </div>
  )
}
