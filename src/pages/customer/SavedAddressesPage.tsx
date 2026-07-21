import { useState } from 'react'
import { MapPin, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { AddressFormModal } from '@/components/checkout/AddressFormModal'
import { SavedAddressCard } from '@/components/addresses/SavedAddressCard'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAddresses } from '@/hooks/useAddresses'
import * as addressService from '@/services/addressService'
import type { Address } from '@/types/Address'

export default function SavedAddressesPage() {
  const { addresses, isLoading, error, refetch } = useAddresses()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null)
  const [isBusy, setIsBusy] = useState(false)

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
    <Container as="div" className="py-8 md:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Saved Addresses</h1>
          <p className="mt-3 max-w-2xl text-base text-text-secondary md:text-lg">
            Add and manage multiple delivery addresses with pincode and nearest
            landmark.
          </p>
        </div>
        <Button type="button" onClick={openAddForm} className="shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Address
        </Button>
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && addresses.length === 0 && (
        <EmptyState
          icon={MapPin}
          title="No addresses yet"
          description="Save home, work, or other delivery addresses for faster checkout."
          actionLabel="Add Address"
          onAction={openAddForm}
        />
      )}

      {!isLoading && !error && addresses.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <SavedAddressCard
              key={address.id}
              address={address}
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
    </Container>
  )
}

function formatPreview(address: Address): string {
  return `${address.full_name} — ${address.address_line1}, ${address.city} ${address.pincode}`
}
