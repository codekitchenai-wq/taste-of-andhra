import toast from 'react-hot-toast'
import { PartyInquiryTable } from '@/components/admin/PartyInquiryTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAdminPartyInquiries } from '@/hooks/useAdminPartyInquiries'
import * as partyInquiryService from '@/services/partyInquiryService'
import type { PartyInquiry } from '@/types/PartyInquiry'

export default function AdminPartyInquiriesPage() {
  const { inquiries, isLoading, error, refetch } = useAdminPartyInquiries()

  const handleStatusChange = async (
    id: string,
    status: PartyInquiry['status'],
  ) => {
    const result = await partyInquiryService.updatePartyInquiryStatus(id, status)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Inquiry status updated')
    void refetch()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Party Inquiries</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Review and follow up on party order enquiries from customers.
        </p>
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && inquiries.length === 0 && (
        <EmptyState
          title="No inquiries yet"
          description="Party order enquiries will appear here when customers submit the form."
        />
      )}

      {!isLoading && !error && inquiries.length > 0 && (
        <PartyInquiryTable
          inquiries={inquiries}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
