import { useState } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { AddressFormModal } from '@/components/checkout/AddressFormModal'
import { SavedAddressCard } from '@/components/addresses/SavedAddressCard'
import { ProfileSectionCard } from '@/components/customer/ProfileSectionCard'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { Modal } from '@/components/ui/Modal'
import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useAddresses } from '@/hooks/useAddresses'
import { useSelectedBranch } from '@/hooks/useSelectedBranch'
import * as addressService from '@/services/addressService'
import type { Address } from '@/types/Address'
import { restaurantLocationFromBranch } from '@/utils/nearbyAddress'
import { formatAddressLabel } from '@/utils/mapAddress'
import { isSpiceMalabarStorefront } from '@/utils/storefrontCopy'

export function ProfileAddressesSection() {
  const org = useOrganization()
  const isChopsticks = isSpiceMalabarStorefront(org)
  const { addresses, isLoading, error, refetch } = useAddresses()
  const { selectedBranch } = useSelectedBranch()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const chopsticksDefaults = isChopsticks
    ? {
        defaultCity: ONAM_SADHYA.defaultCity,
        defaultState: ONAM_SADHYA.defaultState,
      }
    : {}

  const openAddForm = () => {
    setEditingAddress(null)
    setIsFormOpen(true)
  }

  const openEditForm = (address: Address) => {
    setEditingAddress(address)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingAddress(null)
  }

  const handleSetDefault = async (address: Address) => {
    setIsBusy(true)
    const result = await addressService.setDefaultAddress(address.id)
    setIsBusy(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Default address updated')
    await refetch()
  }

  const handleDelete = async () => {
    if (!deletingAddress) return

    setIsBusy(true)
    const result = await addressService.deleteAddress(deletingAddress.id)
    setIsBusy(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Address deleted')
    setDeletingAddress(null)
    await refetch()
  }

  return (
    <ProfileSectionCard
      title="Delivery addresses"
      description="Save home, work, or another named place — including an address for someone else."
      action={
        <Button type="button" onClick={openAddForm} size="sm">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Address
        </Button>
      }
    >
      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && addresses.length === 0 && (
        <p className="rounded-xl border border-dashed border-black/10 bg-background px-4 py-5 text-sm text-text-secondary">
          No saved addresses yet. Add one to use at checkout.
        </p>
      )}

      {!isLoading && !error && addresses.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <SavedAddressCard
              key={address.id}
              address={address}
              compact
              isBusy={isBusy}
              onEdit={openEditForm}
              onDelete={setDeletingAddress}
              onSetDefault={(item) => void handleSetDefault(item)}
            />
          ))}
        </div>
      )}

      <AddressFormModal
        isOpen={isFormOpen}
        addressToEdit={editingAddress}
        restaurantLocation={restaurantLocationFromBranch(selectedBranch)}
        branchId={selectedBranch?.id ?? null}
        {...chopsticksDefaults}
        onClose={closeForm}
        onSuccess={() => {
          void refetch()
        }}
      />

      <Modal
        isOpen={Boolean(deletingAddress)}
        onClose={() => setDeletingAddress(null)}
        title="Delete Address"
      >
        <p className="text-sm text-text-secondary">
          Remove this delivery address? This cannot be undone.
        </p>
        {deletingAddress && (
          <p className="mt-3 text-sm font-medium text-text-primary">
            {formatAddressLabel(deletingAddress.address_type)} —{' '}
            {deletingAddress.address_line1}, {deletingAddress.city}{' '}
            {deletingAddress.pincode}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDeletingAddress(null)}
            disabled={isBusy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void handleDelete()}
            disabled={isBusy}
          >
            {isBusy ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </ProfileSectionCard>
  )
}
