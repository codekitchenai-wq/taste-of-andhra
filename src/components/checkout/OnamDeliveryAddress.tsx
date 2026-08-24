import { useEffect, useState } from 'react'
import { AlertCircle, MapPin, Pencil, Plus } from 'lucide-react'
import { AddressCard } from '@/components/checkout/AddressCard'
import { AddressFormModal } from '@/components/checkout/AddressFormModal'
import { Button } from '@/components/ui/Button'
import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import { useDeliverySettings } from '@/hooks/useDeliverySettings'
import { useSelectedBranch } from '@/hooks/useSelectedBranch'
import type { Address } from '@/types/Address'
import { formatAddressLabel, formatAddressLine } from '@/utils/mapAddress'
import {
  distanceToRestaurantKm,
  isWithinNearbyDelivery,
  restaurantLocationFromBranch,
} from '@/utils/nearbyAddress'
import { onamDeliveryOutOfRangeMessage } from '@/utils/onamDeliveryCopy'

interface OnamDeliveryAddressProps {
  addresses: Address[]
  isLoading: boolean
  onRefetch: () => void | Promise<void>
  selectedAddressId: string | null
  onSelect: (addressId: string | null) => void
  onLoadingChange?: (isLoading: boolean) => void
  requestAddAddress: number
}

export function OnamDeliveryAddress({
  addresses,
  isLoading,
  onRefetch,
  selectedAddressId,
  onSelect,
  onLoadingChange,
  requestAddAddress,
}: OnamDeliveryAddressProps) {
  const { selectedBranch } = useSelectedBranch()
  const { settings: deliverySettings } = useDeliverySettings(
    selectedBranch?.id ?? null,
  )
  const restaurantLocation = restaurantLocationFromBranch(selectedBranch)
  const [isChanging, setIsChanging] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [addressToEdit, setAddressToEdit] = useState<Address | null>(null)

  const selected =
    addresses.find((address) => address.id === selectedAddressId) ?? null

  const maxKm =
    deliverySettings?.max_distance_km ?? ONAM_SADHYA.deliveryRadiusKm
  const selectedDistanceKm =
    selected &&
    restaurantLocation &&
    selected.latitude != null &&
    selected.longitude != null
      ? distanceToRestaurantKm(
          selected.latitude,
          selected.longitude,
          restaurantLocation,
        )
      : null
  const selectedOutOfRange =
    selectedDistanceKm != null &&
    !isWithinNearbyDelivery(selectedDistanceKm, maxKm)

  useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading, onLoadingChange])

  useEffect(() => {
    if (isLoading) return

    if (addresses.length === 0) {
      if (selectedAddressId) onSelect(null)
      return
    }

    const stillValid = addresses.some(
      (address) => address.id === selectedAddressId,
    )
    if (stillValid) return

    const next =
      addresses.find((address) => address.is_default) ?? addresses[0]
    onSelect(next.id)
  }, [addresses, isLoading, onSelect, selectedAddressId])

  useEffect(() => {
    if (!requestAddAddress) return
    setAddressToEdit(null)
    setIsModalOpen(true)
  }, [requestAddAddress])

  const openAdd = () => {
    setAddressToEdit(null)
    setIsModalOpen(true)
  }

  const openEdit = (address: Address) => {
    setAddressToEdit(address)
    setIsModalOpen(true)
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-text-primary">
          Delivery address
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add new
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-2 text-sm text-text-secondary">
          Loading your saved addresses…
        </p>
      ) : addresses.length === 0 ? (
        <div className="mt-2 rounded-[var(--radius-card)] border border-dashed border-primary/30 bg-primary/5 p-3">
          <p className="text-sm text-text-primary">
            Add a delivery address so we know where to send the sadhya.
          </p>
          <Button type="button" size="sm" className="mt-3" onClick={openAdd}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Add address
          </Button>
        </div>
      ) : isChanging ? (
        <div className="mt-2 space-y-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              selected={selectedAddressId === address.id}
              onSelect={(addressId) => {
                onSelect(addressId)
                setIsChanging(false)
              }}
              onEdit={openEdit}
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsChanging(false)}
          >
            Done
          </Button>
        </div>
      ) : selected ? (
        <div className="mt-2 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-start gap-2">
            <MapPin
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                {formatAddressLabel(selected.address_type)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Deliver to {selected.full_name}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {formatAddressLine(selected)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {selected.phone}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsChanging(true)}
            >
              Change
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => openEdit(selected)}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          </div>
          {selectedOutOfRange ? (
            <div
              className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950"
              role="status"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                aria-hidden="true"
              />
              <p>
                {onamDeliveryOutOfRangeMessage({
                  distanceKm: selectedDistanceKm,
                  maxKm,
                })}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <AddressFormModal
        isOpen={isModalOpen}
        addressToEdit={addressToEdit}
        restaurantLocation={restaurantLocation}
        branchId={selectedBranch?.id ?? null}
        defaultCity={ONAM_SADHYA.defaultCity}
        defaultState={ONAM_SADHYA.defaultState}
        onClose={() => {
          setIsModalOpen(false)
          setAddressToEdit(null)
        }}
        onSuccess={(addressId) => {
          setIsModalOpen(false)
          setAddressToEdit(null)
          onSelect(addressId)
          setIsChanging(false)
          void onRefetch()
        }}
      />
    </div>
  )
}
