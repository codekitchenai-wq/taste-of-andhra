import { useState } from 'react'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { CustomerTable } from '@/components/admin/CustomerTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAdminCustomers } from '@/hooks/useAdminCustomers'
import * as customerService from '@/services/customerService'

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('')
  const { customers, isLoading, error, refetch } = useAdminCustomers(search)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggleActive = async (customerId: string, isActive: boolean) => {
    setIsUpdating(true)

    const result = await customerService.setCustomerActive(
      customerId,
      isActive,
    )

    setIsUpdating(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(isActive ? 'Customer activated' : 'Customer deactivated')
    void refetch()
  }

  return (
    <div className="space-y-6">
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
          title="No customers found"
          description="Try a different search term."
        />
      )}

      {!isLoading && !error && customers.length > 0 && (
        <CustomerTable
          customers={customers}
          onToggleActive={handleToggleActive}
          isUpdating={isUpdating}
        />
      )}
    </div>
  )
}
