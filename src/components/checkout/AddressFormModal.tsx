import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Home, MapPin, Navigation, Briefcase, MoreHorizontal, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { useDeliverySettings } from '@/hooks/useDeliverySettings'
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
import { calculateRateCardAmount } from '@/utils/deliveryRateCard'
import { formatPrice } from '@/utils/format'

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
  branchId?: string | null
  /** Cart subtotal used to calculate the free-delivery threshold preview */
  subtotal?: number
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

const ADDRESS_TYPE_OPTIONS = [
  { value: 'home', label: 'Home', Icon: Home },
  { value: 'work', label: 'Work', Icon: Briefcase },
  { value: 'other', label: 'Other', Icon: MoreHorizontal },
]

type LocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'found'; distanceKm: number; latitude: number; longitude: number }
  | { status: 'out_of_range'; distanceKm: number }
  | { status: 'denied' }
  | { status: 'error'; message: string }

export function AddressFormModal({
  isOpen,
  onClose,
  onSuccess,
  addressToEdit = null,
  restaurantLocation = null,
  branchId = null,
  subtotal = 0,
}: AddressFormModalProps) {
  const isEditing = Boolean(addressToEdit)
  const canDetectLocation = Boolean(restaurantLocation) && !isEditing
  const { user } = useAuth()
  const { settings: deliverySettings } = useDeliverySettings(branchId)

  const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' })

  // Coordinates used at submit time — kept separate so edits after GPS don't lose the pin
  const coordinatesRef = useRef<{ latitude: number; longitude: number } | null>(null)
  // Distance recomputed whenever coordinates change
  const [distanceKm, setDistanceKm] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({ defaultValues: emptyValues })

  const addressType = watch('addressType')
  const addressLine1 = watch('addressLine1')
  const addressLine2 = watch('addressLine2')
  const landmark = watch('landmark')
  const city = watch('city')
  const state = watch('state')
  const pincode = watch('pincode')

  useEffect(() => {
    if (!isOpen) return

    setLocationState({ status: 'idle' })
    coordinatesRef.current = null
    setDistanceKm(null)

    if (addressToEdit) {
      reset(toFormValues(addressToEdit))
      if (addressToEdit.latitude != null && addressToEdit.longitude != null) {
        coordinatesRef.current = {
          latitude: addressToEdit.latitude,
          longitude: addressToEdit.longitude,
        }
        setDistanceKm(addressToEdit.distance_km ?? null)
      }
      return
    }

    const registeredPhone = user?.phone?.replace(/\D/g, '').slice(-10) ?? ''
    reset({ ...emptyValues, fullName: user?.full_name ?? '', phone: registeredPhone })
  }, [isOpen, addressToEdit, user, reset])

  const fillFromPlace = (place: {
    addressLine1?: string
    addressLine2?: string
    landmark?: string
    city?: string
    state?: string
    pincode?: string
    formattedAddress?: string
  }) => {
    const opts = { shouldValidate: true, shouldDirty: true }
    if (place.addressLine1 || place.formattedAddress)
      setValue('addressLine1', place.addressLine1 || place.formattedAddress || '', opts)
    if (place.addressLine2) setValue('addressLine2', place.addressLine2, opts)
    if (place.landmark) setValue('landmark', place.landmark, opts)
    if (place.city) setValue('city', place.city, opts)
    if (place.state) setValue('state', place.state, opts)
    if (place.pincode) setValue('pincode', place.pincode, opts)
  }

  const handleDetectLocation = async () => {
    if (!restaurantLocation) return
    setLocationState({ status: 'locating' })

    try {
      const coords = await readBrowserCoordinates()
      const km = distanceToRestaurantKm(coords.latitude, coords.longitude, restaurantLocation)

      // Use the tenant's configured max_distance_km if available, otherwise
      // fall back to the GPS-based nearby-delivery cap.
      const maxKm = deliverySettings?.max_distance_km ?? NEARBY_DELIVERY_MAX_KM
      if (!isWithinNearbyDelivery(km, maxKm)) {
        coordinatesRef.current = null
        setDistanceKm(null)
        setLocationState({ status: 'out_of_range', distanceKm: km })
        return
      }

      coordinatesRef.current = coords
      setDistanceKm(km)
      setLocationState({ status: 'found', distanceKm: km, ...coords })

      if (isGoogleMapsConfigured) {
        try {
          const maps = await loadGoogleMaps()
          const lookup = await reverseGeocode(maps, coords.latitude, coords.longitude)
          if (lookup.ok) fillFromPlace(lookup.place)
        } catch {
          // GPS pin saved — fields can be typed manually
        }
      }
    } catch (err) {
      coordinatesRef.current = null
      setDistanceKm(null)
      const msg = err instanceof Error ? err.message : 'Could not read your location.'
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('blocked')) {
        setLocationState({ status: 'denied' })
      } else {
        setLocationState({ status: 'error', message: msg })
      }
    }
  }

  const onSubmit = async (values: AddressFormValues) => {
    // Recompute distance if coords exist (catches manual edits after GPS)
    let finalDistanceKm: number | null = distanceKm
    if (coordinatesRef.current && restaurantLocation) {
      finalDistanceKm = distanceToRestaurantKm(
        coordinatesRef.current.latitude,
        coordinatesRef.current.longitude,
        restaurantLocation,
      )
    }

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
      latitude: coordinatesRef.current?.latitude ?? addressToEdit?.latitude ?? null,
      longitude: coordinatesRef.current?.longitude ?? addressToEdit?.longitude ?? null,
      distanceKm: finalDistanceKm,
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
        <div className="flex items-center gap-3">
          <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              form="address-form"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              {...register('isDefault')}
            />
            Default address
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="shrink-0"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="address-form"
            disabled={isSubmitting}
            className="shrink-0"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Address' : 'Save Address'}
          </Button>
        </div>
      }
    >
      <form id="address-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

        {/* ── GPS / location detect strip ── */}
        {canDetectLocation && (
          <div
            className={cn(
              'rounded-xl border px-4 py-3 transition-colors',
              locationState.status === 'found'
                ? 'border-green-200 bg-green-50'
                : locationState.status === 'out_of_range' || locationState.status === 'denied' || locationState.status === 'error'
                  ? 'border-red-100 bg-red-50'
                  : 'border-gray-200 bg-gray-50',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Navigation
                  className={cn(
                    'h-4 w-4 shrink-0',
                    locationState.status === 'found' ? 'text-green-600' : 'text-text-secondary',
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  {locationState.status === 'idle' && (
                    <p className="text-sm font-medium text-text-primary">
                      Detect my location
                    </p>
                  )}
                  {locationState.status === 'locating' && (
                    <p className="text-sm font-medium text-text-primary animate-pulse">
                      Detecting…
                    </p>
                  )}
                  {locationState.status === 'found' && (
                    <>
                      <p className="text-sm font-semibold text-green-700">
                        Location detected
                      </p>
                      <p className="text-xs text-green-600">
                        ~{locationState.distanceKm.toFixed(1)} km from {restaurantLocation?.name} · Review and correct fields below
                      </p>
                      {deliverySettings && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
                          <Truck className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {deliverySettings.free_delivery_threshold !== null &&
                          subtotal >= deliverySettings.free_delivery_threshold
                            ? 'Free delivery on this order'
                            : `Est. delivery charge: ${formatPrice(
                                calculateRateCardAmount(
                                  deliverySettings,
                                  subtotal,
                                  locationState.distanceKm,
                                ),
                              )}`}
                        </p>
                      )}
                    </>
                  )}
                  {locationState.status === 'out_of_range' && (
                    <>
                      <p className="text-sm font-semibold text-red-600">Outside delivery area</p>
                      <p className="text-xs text-red-500">
                        You are {locationState.distanceKm.toFixed(1)} km away — we deliver within{' '}
                        {deliverySettings?.max_distance_km ?? NEARBY_DELIVERY_MAX_KM} km
                      </p>
                    </>
                  )}
                  {locationState.status === 'denied' && (
                    <>
                      <p className="text-sm font-semibold text-red-600">Location access blocked</p>
                      <p className="text-xs text-red-500">
                        Allow location in your browser settings, or enter your address below
                      </p>
                    </>
                  )}
                  {locationState.status === 'error' && (
                    <p className="text-xs text-red-500">{locationState.message}</p>
                  )}
                </div>
              </div>

              {locationState.status !== 'out_of_range' && (
                <button
                  type="button"
                  onClick={() => void handleDetectLocation()}
                  disabled={locationState.status === 'locating'}
                  className={cn(
                    'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    locationState.status === 'found'
                      ? 'border-green-300 text-green-700 hover:bg-green-100'
                      : 'border-gray-300 text-text-primary hover:border-primary/40 hover:text-primary',
                    locationState.status === 'locating' && 'cursor-not-allowed opacity-50',
                  )}
                >
                  {locationState.status === 'found' ? 'Re-detect' : 'Use my location'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Address type pills ── */}
        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">Address type</p>
          <div className="flex gap-2">
            {ADDRESS_TYPE_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue('addressType', value, { shouldDirty: true })}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  addressType === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 text-text-secondary hover:border-primary/30 hover:text-text-primary',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contact ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Contact
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Full Name"
              error={errors.fullName?.message}
              {...register('fullName', { required: 'Full name is required' })}
            />
            <Input
              label="Phone"
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile"
              error={errors.phone?.message}
              {...register('phone', {
                required: 'Phone number is required',
                pattern: {
                  value: /^\d{10}$/,
                  message: 'Enter a valid 10-digit number',
                },
              })}
            />
          </div>
        </div>

        {/* ── Address ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Address
          </p>

          <Input
            label="House / Flat, Street"
            placeholder="e.g. 12B, MG Road"
            error={errors.addressLine1?.message}
            value={addressLine1}
            {...register('addressLine1', { required: 'Address line 1 is required' })}
            onChange={(e) =>
              setValue('addressLine1', e.target.value, { shouldValidate: true, shouldDirty: true })
            }
          />

          <Input
            label="Apartment / Floor / Area (optional)"
            placeholder="e.g. 3rd floor, Sobha Apartments"
            value={addressLine2}
            {...register('addressLine2')}
            onChange={(e) => setValue('addressLine2', e.target.value, { shouldDirty: true })}
          />

          <Input
            label="Nearest Landmark"
            placeholder="e.g. Near Metro station / temple"
            error={errors.landmark?.message}
            value={landmark}
            {...register('landmark', {
              required: 'Landmark is required — helps the delivery partner',
              minLength: { value: 2, message: 'Enter a recognisable landmark' },
            })}
            onChange={(e) =>
              setValue('landmark', e.target.value, { shouldValidate: true, shouldDirty: true })
            }
          />
        </div>

        {/* ── Location ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Location
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="City"
              error={errors.city?.message}
              value={city}
              {...register('city', { required: 'City is required' })}
              onChange={(e) =>
                setValue('city', e.target.value, { shouldValidate: true, shouldDirty: true })
              }
            />
            <Input
              label="State"
              error={errors.state?.message}
              value={state}
              {...register('state', { required: 'State is required' })}
              onChange={(e) =>
                setValue('state', e.target.value, { shouldValidate: true, shouldDirty: true })
              }
            />
            <Input
              label="Pincode"
              placeholder="6 digits"
              inputMode="numeric"
              error={errors.pincode?.message}
              value={pincode}
              {...register('pincode', {
                required: 'Pincode is required',
                pattern: { value: /^\d{6}$/, message: 'Enter a valid 6-digit pincode' },
              })}
              onChange={(e) =>
                setValue('pincode', e.target.value, { shouldValidate: true, shouldDirty: true })
              }
            />
          </div>
        </div>

        {/* ── Distance badge (editing with saved pin) ── */}
        {isEditing && distanceKm != null && locationState.status === 'idle' && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Saved distance: ~{distanceKm.toFixed(1)} km from {restaurantLocation?.name ?? 'restaurant'}
          </div>
        )}
      </form>
    </Modal>
  )
}
