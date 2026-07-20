import type { Profile } from '@/types/Profile'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/utils/format'

interface CustomerTableProps {
  customers: Profile[]
}

export function CustomerTable({ customers }: CustomerTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-black/5 bg-background/60">
          <tr>
            <th className="px-4 py-3 font-semibold text-text-primary">Name</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Email</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Phone</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Status</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Joined</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className="border-b border-black/5 last:border-b-0"
            >
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {customer.full_name.charAt(0)}
                  </div>
                  <span className="font-medium text-text-primary">
                    {customer.full_name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-4 text-text-secondary">{customer.email}</td>
              <td className="px-4 py-4 text-text-secondary">
                {customer.phone ?? '—'}
              </td>
              <td className="px-4 py-4">
                <Badge variant={customer.is_active ? 'veg' : 'unavailable'}>
                  {customer.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-4 text-text-secondary">
                {formatDate(customer.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
