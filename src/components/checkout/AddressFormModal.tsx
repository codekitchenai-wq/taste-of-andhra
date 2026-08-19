import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Home, Briefcase, MoreHorizontal, Truck, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LocationPicker } from '@/components/checkout/LocationPicker'
import { useAuth } from '@/hooks/useAuth'
import { useDeliverySettings } from '@/hooks/useDeliverySettings'
import type { CreateAddressInput } from '@/services/addressService'
import * as addressService from '@/services/addressService'
import type { Address } from '@/types/Address'
import { cn } from '@/utils/cn'
import type { ResolvedPlace } from '@/utils/googleMaps'
import {
  distanceToRestaurantKm,
  isWithinNearbyDelivery,
  NEARBY_DELIVERY_MAX_KM,
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
  const { user } = useAuth()
  const { settings: deliverySettings } = useDeliverySettings(branchId)

  // Coordinates from the map pin
  const coordinatesRef = useRef<{ latitude: number; longitude: number } | null>(null)
  const [pinnedCoords, setPinnedCoords] = useState<{ latitude: number; longitude: number } | null>(null)

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

    coordinatesRef.current = null
    setPinnedCoords(null)

    if (addressToEdit) {
      reset(toFormValues(addressToEdit))
      if (addressToEdit.latitude != null && addressToEdit.longitude != null) {
        const coords = { latitude: addressToEdit.latitude, longitude: addressToEdit.longitude }
        coordinatesRef.current = coords
        setPinnedCoords(coords)
      }
      return
    }

    const registeredPhone = user?.phone?.replace(/\D/g, '').slice(-10) ?? ''
    reset({ ...emptyValues, fullName: user?.full_name ?? '', phone: registeredPhone })
  }, [isOpen, addressToEdit, user, reset])

  const handleMapChange = (place: ResolvedPlace) => {
    const coords = { latitude: place.latitude, longitude: place.longitude }
    coordinatesRef.current = coords
    setPinnedCoords(coords)

    const opts = { shouldValidate: true, shouldDirty: true }
    if (place.addressLine1 || place.formattedAddress)
      setValue('addressLine1', place.addressLine1 || place.formattedAddress || '', opts)
    if (place.addressLine2) setValue('addressLine2', place.addressLine2, opts)
    if (place.landmark) setValue('landmark', place.landmark, opts)
    if (place.city) setValue('city', place.city, opts)
    if (place.state) setValue('state', place.state, opts)
    if (place.pincode) setValue('pincode', place.pincode, opts)
  }

  // Delivery status derived from pin vs restaurant location
  const pinDistanceKm =
    pinnedCoords && restaurantLocation
      ? distanceToRestaurantKm(pinnedCoords.latitude, pinnedCoords.longitude, restaurantLocation)
      : null

  const maxKm = deliverySettings?.max_distance_km ?? NEARBY_DELIVERY_MAX_KM
  const isOutOfRange = pinDistanceKm !== null && !isWithinNearbyDelivery(pinDistanceKm, maxKm)

  const deliveryChargePreview =
    pinnedCoords && deliverySettings && !isOutOfRange
      ? calculateRateCardAmount(deliverySettings, subtotal, pinDistanceKm)
      : null

  const isFreeDelivery =
    deliverySettings?.free_delivery_threshold !== null &&
    deliverySettings?.free_delivery_threshold !== undefined &&
    subtotal >= deliverySettings.free_delivery_threshold

  const onSubmit = async (values: AddressFormValues) => {
    let finalDistanceKm: number | null = pinDistanceKm
    if (!finalDistanceKm && coordinatesRef.current && restaurantLocation) {
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
      className="max-w-lg"
      footer={
        <div className="flex items-center gap-3">
          <label className="flex flex-1 cursor-pointer select-none items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              form="address-form"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              {...register('isDefault')}
            />
            Default
          </label>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting} className="shrink-0">
            Cancel
          </Button>
          <Button type="submit" form="address-form" disabled={isSubmitting} className="shrink-0">
            {isSubmitting ? 'Saving…' : isEditing ? 'Update' : 'Save Address'}
          </Button>
        </div>
      }
    >
      <form id="address-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

        {/* ── Map pin ── */}
        <div className="space-y-2">
          <LocationPicker
            latitude={pinnedCoords?.latitude ?? null}
            longitude={pinnedCoords?.longitude ?? null}
            onChange={handleMapChange}
          />

          {/* Delivery distance status badge — only shown when pinned */}
          {pinnedCoords && restaurantLocation && pinDistanceKm !== null && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
                isOutOfRange
                  ? 'bg-red-50 text-red-600'
                  : 'bg-green-50 text-green-700',
              )}
            >
              {isOutOfRange ? (
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              {isOutOfRange ? (
                <>
                  {pinDistanceKm.toFixed(1)} km away — outside delivery area ({maxKm} km max).
                  Enter your address anyway.
                </>
              ) : (
                <>
                  ~{pinDistanceKm.toFixed(1)} km from {restaurantLocation.name}
                  {deliveryChargePreview !== null && (
                    <span className="ml-auto flex items-center gap-1">
                      <Truck className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {isFreeDelivery ? 'Free delivery' : `Est. ${formatPrice(deliveryChargePreview)}`}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Address type pills ── */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-text-secondary">Type</span>
          {ADDRESS_TYPE_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue('addressType', value, { shouldDirty: true })}
              className={cn(
                'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                addressType === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 text-text-secondary hover:border-primary/30 hover:text-text-primary',
              )}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Contact row ── */}
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
              required: 'Phone is required',
              pattern: { value: /^\d{10}$/, message: 'Enter a valid 10-digit number' },
            })}
          />
        </div>

        {/* ── Address line 1 ── */}
        <Input
          label="House / Flat, Street"
          placeholder="e.g. 12B, MG Road"
          error={errors.addressLine1?.message}
          value={addressLine1}
          {...register('addressLine1', { required: 'Address is required' })}
          onChange={(e) => setValue('addressLine1', e.target.value, { shouldValidate: true, shouldDirty: true })}
        />

        {/* ── Address line 2 + Landmark row ── */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Floor / Area (optional)"
            placeholder="e.g. 3rd floor, Sobha Apts"
            value={addressLine2}
            {...register('addressLine2')}
            onChange={(e) => setValue('addressLine2', e.target.value, { shouldDirty: true })}
          />
          <Input
            label="Landmark"
            placeholder="Near metro / temple"
            error={errors.landmark?.message}
            value={landmark}
            {...register('landmark', {
              required: 'Landmark helps the delivery partner',
              minLength: { value: 2, message: 'Enter a recognisable landmark' },
            })}
            onChange={(e) => setValue('landmark', e.target.value, { shouldValidate: true, shouldDirty: true })}
          />
        </div>

        {/* ── City / State / Pincode row ── */}
        <div className="grid gap-3 grid-cols-3">
          <Input
            label="City"
            error={errors.city?.message}
            value={city}
            {...register('city', { required: 'Required' })}
            onChange={(e) => setValue('city', e.target.value, { shouldValidate: true, shouldDirty: true })}
          />
          <Input
            label="State"
            error={errors.state?.message}
            value={state}
            {...register('state', { required: 'Required' })}
            onChange={(e) => setValue('state', e.target.value, { shouldValidate: true, shouldDirty: true })}
          />
          <Input
            label="Pincode"
            placeholder="6 digits"
            inputMode="numeric"
            error={errors.pincode?.message}
            value={pincode}
            {...register('pincode', {
              required: 'Required',
              pattern: { value: /^\d{6}$/, message: '6-digit pincode' },
            })}
            onChange={(e) => setValue('pincode', e.target.value, { shouldValidate: true, shouldDirty: true })}
          />
        </div>
      </form>
    </Modal>
  )
}
