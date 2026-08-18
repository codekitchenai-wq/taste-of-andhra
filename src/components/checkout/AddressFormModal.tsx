import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Crosshair, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { ADDRESS_TYPES } from '@/constants/ORDER'
import { useAuth } from '@/hooks/useAuth'
import type { CreateAddressInput } from '@/services/addressService'
import * as addressService from '@/services/addressService'
import type { Address } from '@/types/Address'
import { cn } from '@/utils/cn'
import {
  isGoogleMapsConfigured,
  loadGoogleMaps,
  reverseGeocode,
} from '@/utils/googleMaps'
import {
  distanceToRestaurantKm,
  isWithinNearbyDelivery,
  NEARBY_DELIVERY_MAX_KM,
  readBrowserCoordinates,
  type RestaurantLocation,
} from '@/utils/nearbyAddress'

type EntryMode = 'nearby' | 'manual'

interface AddressFormValues {
  addressType: string
  fullName: string
  phone: string
  addressLine1: string
  addressLine2: string
  landmark: string
  city: string
  state: string
  pincode: string
  isDefault: boolean
}

interface AddressFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (addressId: string) => void
  addressToEdit?: Address | null
  restaurantLocation?: RestaurantLocation | null
}

const emptyValues: AddressFormValues = {
  addressType: 'home',
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: true,
}

function toFormValues(address: Address): AddressFormValues {
  return {
    addressType: address.address_type || 'home',
    fullName: address.full_name,
    phone: address.phone,
    addressLine1: address.address_line1,
    addressLine2: address.address_line2 ?? '',
    landmark: address.landmark ?? '',
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    isDefault: address.is_default,
  }
}

export function AddressFormModal({
  isOpen,
  onClose,
  onSuccess,
  addressToEdit = null,
  restaurantLocation = null,
}: AddressFormModalProps) {
  const isEditing = Boolean(addressToEdit)
  const canUseNearby = Boolean(restaurantLocation) && !isEditing
  const { user } = useAuth()
  const [entryMode, setEntryMode] = useState<EntryMode>('manual')
  const [coordinates, setCoordinates] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [nearbyMessage, setNearbyMessage] = useState<string | null>(null)
  const [nearbyError, setNearbyError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    defaultValues: emptyValues,
  })

  const addressLine1 = watch('addressLine1')
  const addressLine2 = watch('addressLine2')
  const landmark = watch('landmark')
  const city = watch('city')
  const state = watch('state')
  const pincode = watch('pincode')

  useEffect(() => {
    if (!isOpen) return

    setNearbyMessage(null)
    setNearbyError(null)
    setIsLocating(false)

    if (addressToEdit) {
      reset(toFormValues(addressToEdit))
      setCoordinates(
        addressToEdit.latitude != null && addressToEdit.longitude != null
          ? {
              latitude: addressToEdit.latitude,
              longitude: addressToEdit.longitude,
            }
          : null,
      )
      setEntryMode('manual')
      return
    }

    const registeredPhone = user?.phone?.replace(/\D/g, '').slice(-10) ?? ''

    reset({
      ...emptyValues,
      fullName: user?.full_name ?? '',
      phone: registeredPhone,
      isDefault: true,
    })
    setCoordinates(null)
    setEntryMode(restaurantLocation ? 'nearby' : 'manual')
  }, [isOpen, addressToEdit, user, reset, restaurantLocation])

  const fillFromPlace = (place: {
    addressLine1?: string
    addressLine2?: string
    landmark?: string
    city?: string
    state?: string
    pincode?: string
    formattedAddress?: string
  }) => {
    const current = getValues()
    const options = { shouldValidate: true, shouldDirty: true }
    setValue(
      'addressLine1',
      place.addressLine1 || place.formattedAddress || current.addressLine1,
      options,
    )
    if (place.addressLine2) setValue('addressLine2', place.addressLine2, options)
    if (place.landmark) setValue('landmark', place.landmark, options)
    if (place.city) setValue('city', place.city, options)
    if (place.state) setValue('state', place.state, options)
    if (place.pincode) setValue('pincode', place.pincode, options)
  }

  const handleUseNearbyLocation = async () => {
    if (!restaurantLocation) {
      setEntryMode('manual')
      setNearbyError('Restaurant location is not set. Enter your address.')
      return
    }

    setIsLocating(true)
    setNearbyError(null)
    setNearbyMessage(null)

    try {
      const coords = await readBrowserCoordinates()
      const distanceKm = distanceToRestaurantKm(
        coords.latitude,
        coords.longitude,
        restaurantLocation,
      )

      if (!isWithinNearbyDelivery(distanceKm)) {
        setCoordinates(null)
        setEntryMode('manual')
        setNearbyError(
          `You are about ${distanceKm.toFixed(1)} km from ${restaurantLocation.name}. We deliver within ${NEARBY_DELIVERY_MAX_KM} km. Enter your address below.`,
        )
        return
      }

      setCoordinates(coords)

      if (isGoogleMapsConfigured) {
        try {
          const maps = await loadGoogleMaps()
          const lookup = await reverseGeocode(
            maps,
            coords.latitude,
            coords.longitude,
          )
          if (lookup.ok) {
            fillFromPlace(lookup.place)
          }
        } catch {
          // Coordinates still count; the customer can type the remaining fields.
        }
      }

      setNearbyMessage(
        `You are about ${distanceKm.toFixed(1)} km from ${restaurantLocation.name}. Check the address below, then save.`,
      )
    } catch (error) {
      setCoordinates(null)
      setEntryMode('manual')
      setNearbyError(
        error instanceof Error
          ? error.message
          : 'Could not read your location. Enter your address instead.',
      )
    } finally {
      setIsLocating(false)
    }
  }

  const onSubmit = async (values: AddressFormValues) => {
    const payload: CreateAddressInput = {
      addressType: values.addressType,
      fullName: values.fullName,
      phone: values.phone,
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2,
      landmark: values.landmark,
      city: values.city,
      state: values.state,
      pincode: values.pincode,
      latitude: coordinates?.latitude ?? addressToEdit?.latitude ?? null,
      longitude: coordinates?.longitude ?? addressToEdit?.longitude ?? null,
      isDefault: values.isDefault,
    }

    const result =
      isEditing && addressToEdit
        ? await addressService.updateAddress(addressToEdit.id, payload)
        : await addressService.addAddress(payload)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(isEditing ? 'Address updated' : 'Address saved')
    onSuccess(result.data.id)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Address' : 'Add Delivery Address'}
      className="max-w-xl"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="address-form"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting
              ? 'Saving...'
              : isEditing
                ? 'Update Address'
                : 'Save Address'}
          </Button>
        </div>
      }
    >
      <form
        id="address-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {canUseNearby ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-text-primary">
              Choose how to add this address
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={entryMode === 'nearby'}
                onClick={() => {
                  setEntryMode('nearby')
                  setNearbyError(null)
                }}
                className={cn(
                  'flex min-h-[72px] flex-col items-start gap-1 rounded-[var(--radius-button)] border p-3 text-left text-sm transition-colors',
                  entryMode === 'nearby'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-gray-200 hover:border-primary/30',
                )}
              >
                <Crosshair
                  className={cn(
                    'h-4 w-4',
                    entryMode === 'nearby'
                      ? 'text-primary'
                      : 'text-text-secondary',
                  )}
                  aria-hidden="true"
                />
                <span className="font-semibold text-text-primary">
                  Nearby location
                </span>
                <span className="text-xs text-text-secondary">
                  Within {NEARBY_DELIVERY_MAX_KM} km of{' '}
                  {restaurantLocation?.name}
                </span>
              </button>
              <button
                type="button"
                aria-pressed={entryMode === 'manual'}
                onClick={() => setEntryMode('manual')}
                className={cn(
                  'flex min-h-[72px] flex-col items-start gap-1 rounded-[var(--radius-button)] border p-3 text-left text-sm transition-colors',
                  entryMode === 'manual'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-gray-200 hover:border-primary/30',
                )}
              >
                <MapPin
                  className={cn(
                    'h-4 w-4',
                    entryMode === 'manual'
                      ? 'text-primary'
                      : 'text-text-secondary',
                  )}
                  aria-hidden="true"
                />
                <span className="font-semibold text-text-primary">
                  Enter address
                </span>
                <span className="text-xs text-text-secondary">
                  Type house, street and pincode
                </span>
              </button>
            </div>

            {entryMode === 'nearby' ? (
              <div className="space-y-3 rounded-[var(--radius-card)] border border-gray-200 bg-background p-3">
                <p className="text-xs text-text-secondary">
                  We use your phone location and check it against{' '}
                  {restaurantLocation?.name}. No map is shown.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleUseNearbyLocation()}
                  disabled={isLocating}
                >
                  <Crosshair className="h-4 w-4" aria-hidden="true" />
                  {isLocating ? 'Checking location...' : 'Use my location'}
                </Button>
                {nearbyMessage ? (
                  <p className="text-sm text-text-primary">{nearbyMessage}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {nearbyError ? (
          <p className="text-sm text-error" role="alert">
            {nearbyError}
          </p>
        ) : null}

        <Select
          label="Address Type"
          options={ADDRESS_TYPES.map((type) => ({
            label: type.label,
            value: type.value,
          }))}
          {...register('addressType')}
        />

        <Input
          label="Full Name"
          error={errors.fullName?.message}
          {...register('fullName', { required: 'Full name is required' })}
        />

        <Input
          label="Phone"
          type="tel"
          inputMode="numeric"
          placeholder="10-digit mobile number"
          error={errors.phone?.message}
          {...register('phone', {
            required: 'Phone number is required',
            pattern: {
              value: /^\d{10}$/,
              message: 'Enter a valid 10-digit phone number',
            },
          })}
        />
        {!isEditing && user?.phone && (
          <p className="text-xs text-text-secondary">
            Prefills from your registered mobile. You can change it for this
            address.
          </p>
        )}

        <Input
          label="Address Line 1"
          placeholder="House / flat number, street"
          error={errors.addressLine1?.message}
          value={addressLine1}
          {...register('addressLine1', { required: 'Address is required' })}
          onChange={(event) =>
            setValue('addressLine1', event.target.value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />

        <Input
          label="Address Line 2 (optional)"
          placeholder="Apartment, floor, area"
          value={addressLine2}
          {...register('addressLine2')}
          onChange={(event) =>
            setValue('addressLine2', event.target.value, { shouldDirty: true })
          }
        />

        <Input
          label="Nearest Landmark"
          placeholder="e.g. Near Metro station / temple"
          error={errors.landmark?.message}
          value={landmark}
          {...register('landmark', {
            required: 'Nearest landmark is required',
            minLength: {
              value: 2,
              message: 'Enter a nearby landmark',
            },
          })}
          onChange={(event) =>
            setValue('landmark', event.target.value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="City"
            error={errors.city?.message}
            value={city}
            {...register('city', { required: 'City is required' })}
            onChange={(event) =>
              setValue('city', event.target.value, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
          <Input
            label="State"
            error={errors.state?.message}
            value={state}
            {...register('state', { required: 'State is required' })}
            onChange={(event) =>
              setValue('state', event.target.value, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
        </div>

        <Input
          label="Pincode"
          placeholder="6-digit pincode"
          inputMode="numeric"
          error={errors.pincode?.message}
          value={pincode}
          {...register('pincode', {
            required: 'Pincode is required',
            pattern: {
              value: /^\d{6}$/,
              message: 'Enter a valid 6-digit pincode',
            },
          })}
          onChange={(event) =>
            setValue('pincode', event.target.value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />

        <label className="flex items-center gap-3 text-sm text-text-primary">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            {...register('isDefault')}
          />
          Set as default address
        </label>
      </form>
    </Modal>
  )
}
