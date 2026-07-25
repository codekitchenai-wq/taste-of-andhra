import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { DeliveryPartnerFormModal } from '@/components/admin/DeliveryPartnerFormModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import toast from 'react-hot-toast'
import * as deliveryPartnerService from '@/services/deliveryPartnerService'
import type { DeliveryPartner } from '@/types/DeliveryPartner'
import { formatIndianPhone } from '@/utils/phone'

export default function AdminDeliveryPartnersPage() {
  const [partners, setPartners] = useState<DeliveryPartner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<DeliveryPartner | null>(
    null,
  )
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await deliveryPartnerService.getDeliveryPartners()

    if (result.success) {
      setPartners(result.data)
    } else {
      setError(result.message)
      setPartners([])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const openCreateModal = () => {
    setEditingPartner(null)
    setIsFormOpen(true)
  }

  const openEditModal = (partner: DeliveryPartner) => {
    setEditingPartner(partner)
    setIsFormOpen(true)
  }

  const closeFormModal = () => {
    setIsFormOpen(false)
    setEditingPartner(null)
  }

  const handleToggleActive = async (partner: DeliveryPartner) => {
    setUpdatingId(partner.id)

    const result = await deliveryPartnerService.setDeliveryPartnerActive(
      partner.id,
      !partner.is_active,
    )

    setUpdatingId(null)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(partner.is_active ? 'Partner deactivated' : 'Partner activated')
    void refetch()
  }

  const handleDelete = async (partner: DeliveryPartner) => {
    if (!window.confirm(`Remove delivery partner "${partner.full_name}"?`)) return

    setUpdatingId(partner.id)

    const result = await deliveryPartnerService.deleteDeliveryPartner(partner.id)

    setUpdatingId(null)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Delivery partner removed')
    void refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Delivery Partners</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Maintain a reusable list of delivery partners. Active partners appear
            in the assignment dropdown with their phone pre-filled.
          </p>
        </div>
        <Button onClick={openCreateModal} className="shrink-0">
          <Plus className="h-4 w-4" />
          Add Partner
        </Button>
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && partners.length === 0 && (
        <EmptyState
          title="No delivery partners yet"
          description="Add your first delivery partner to speed up order assignment."
          actionLabel="Add Partner"
          onAction={openCreateModal}
        />
      )}

      {!isLoading && !error && partners.length > 0 && (
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-black/5 bg-background/60">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr key={partner.id} className="border-b border-black/5 last:border-b-0">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {partner.full_name}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {formatIndianPhone(partner.phone)}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-text-secondary">
                    {partner.notes ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={partner.is_active ? 'veg' : 'unavailable'}>
                      {partner.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(partner)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={updatingId === partner.id}
                        onClick={() => void handleToggleActive(partner)}
                      >
                        {partner.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={updatingId === partner.id}
                        onClick={() => void handleDelete(partner)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DeliveryPartnerFormModal
        isOpen={isFormOpen}
        partner={editingPartner}
        onClose={closeFormModal}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
