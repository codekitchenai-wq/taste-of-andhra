import { useState } from 'react'
import { Search } from 'lucide-react'
import { CustomerTable } from '@/components/admin/CustomerTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAdminCustomers } from '@/hooks/useAdminCustomers'

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('')
  const { customers, isLoading, error, refetch } = useAdminCustomers(search)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Customers</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Search customers and view their registration details.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
          aria-hidden="true"
        />
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-10"
          aria-label="Search customers"
        />
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && customers.length === 0 && (
        <EmptyState
          title={search ? 'No customers found' : 'No customers yet'}
          description={
            search
              ? 'Try a different search term.'
              : 'Customers will appear here after they register.'
          }
        />
      )}

      {!isLoading && !error && customers.length > 0 && (
        <CustomerTable customers={customers} />
      )}
    </div>
  )
}
