import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { AddressFormModal } from '@/components/checkout/AddressFormModal'
import { SavedAddressCard } from '@/components/addresses/SavedAddressCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { Modal } from '@/components/ui/Modal'
import { useAddresses } from '@/hooks/useAddresses'
import { useSelectedBranch } from '@/hooks/useSelectedBranch'
import * as addressService from '@/services/addressService'
import type { Address } from '@/types/Address'
import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import { useOrganization } from '@/contexts/OrganizationContext'
import { restaurantLocationFromBranch } from '@/utils/nearbyAddress'
import { formatAddressLabel } from '@/utils/mapAddress'
import { isSpiceMalabarStorefront } from '@/utils/storefrontCopy'

export default function SavedAddressesPage() {
  const org = useOrganization()
  const isChopsticks = isSpiceMalabarStorefront(org)
  const { addresses, isLoading, error, refetch } = useAddresses()
  const { selectedBranch } = useSelectedBranch()
  const [searchParams, setSearchParams] = useSearchParams()
  const isSetup = searchParams.get('setup') === '1'
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    if (!isSetup || isLoading || addresses.length > 0) return
    setEditingAddress(null)
    setIsFormOpen(true)
  }, [isSetup, isLoading, addresses.length])

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
    <>
      <div className="mb-3 flex justify-end">
        <Button type="button" onClick={openAddForm} size="sm">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Address
        </Button>
      </div>

      {isSetup ? (
        <p className="mb-3 text-sm text-text-secondary">
          Add your delivery address so we can take your next order.
        </p>
      ) : null}

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && addresses.length === 0 && (
        <EmptyState
          icon={MapPin}
          title={isSetup ? 'Add your first address' : 'No addresses yet'}
          description={
            isSetup
              ? 'Save home or work so checkout is ready the next time you sign in.'
              : 'Save home, work, or other delivery addresses for faster checkout.'
          }
          actionLabel="Add Address"
          onAction={openAddForm}
        />
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
        defaultCity={isChopsticks ? ONAM_SADHYA.defaultCity : ''}
        defaultState={isChopsticks ? ONAM_SADHYA.defaultState : ''}
        onClose={closeForm}
        onSuccess={() => {
          void refetch()
          if (isSetup) {
            setSearchParams({})
            toast.success('Address saved. You are ready to order.')
          }
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
            {formatPreview(deletingAddress)}
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
    </>
  )
}

function formatPreview(address: Address): string {
  return `${formatAddressLabel(address.address_type)} — ${address.address_line1}, ${address.city} ${address.pincode}`
}
