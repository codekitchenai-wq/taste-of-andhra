import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Home, Briefcase, MoreHorizontal, Truck, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LocationPicker } from '@/components/checkout/LocationPicker'
import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import { useAuth } from '@/hooks/useAuth'
import { useDeliverySettings } from '@/hooks/useDeliverySettings'
import { useOrganization } from '@/contexts/OrganizationContext'
import type { CreateAddressInput } from '@/services/addressService'
import * as addressService from '@/services/addressService'
import type { Address } from '@/types/Address'
import { cn } from '@/utils/cn'
import type { ResolvedPlace } from '@/utils/googleMaps'
import type { LocationMode } from '@/components/checkout/LocationPicker'
import {
  distanceToRestaurantKm,
  isWithinNearbyDelivery,
  NEARBY_DELIVERY_MAX_KM,
  type RestaurantLocation,
} from '@/utils/nearbyAddress'
import { onamDeliveryOutOfRangeMessage } from '@/utils/onamDeliveryCopy'
import { isSpiceMalabarStorefront } from '@/utils/storefrontCopy'
import { addressTypeKind } from '@/utils/mapAddress'
import { calculateRateCardAmount } from '@/utils/deliveryRateCard'
import { formatPrice } from '@/utils/format'

interface AddressFormValues {
  addressType: 'home' | 'work' | 'other'
  customLabel: string
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
  /** Prefill city/state when adding a new address (e.g. Chopsticks Onam → Pune). */
  defaultCity?: string
  defaultState?: string
}

const emptyValues: AddressFormValues = {
  addressType: 'home',
  customLabel: '',
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
}

function toFormValues(address: Address): AddressFormValues {
  const kind = addressTypeKind(address.address_type)
  return {
    addressType: kind,
    customLabel:
      kind === 'other' && address.address_type.trim().toLowerCase() !== 'other'
        ? address.address_type
        : '',
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

const ADDRESS_TYPE_OPTIONS: {
  value: AddressFormValues['addressType']
  label: string
  Icon: typeof Home
}[] = [
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
  defaultCity = '',
  defaultState = '',
}: AddressFormModalProps) {
  const isEditing = Boolean(addressToEdit)
  const org = useOrganization()
  const isChopsticks = isSpiceMalabarStorefront(org)
  const { user } = useAuth()
  const { settings: deliverySettings } = useDeliverySettings(branchId)

  const [locateSession, setLocateSession] = useState(0)

  // Coordinates from the map pin
  const coordinatesRef = useRef<{ latitude: number; longitude: number } | null>(null)
  const [pinnedCoords, setPinnedCoords] = useState<{ latitude: number; longitude: number } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({ defaultValues: emptyValues })

  const addressType = watch('addressType')
  const customLabel = watch('customLabel')
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

    if (isChopsticks) {
      setLocateSession((current) => current + 1)
    }

    const registeredPhone = user?.phone?.replace(/\D/g, '').slice(-10) ?? ''
    reset({
      ...emptyValues,
      fullName: user?.full_name ?? '',
      phone: registeredPhone,
      city: defaultCity.trim() || emptyValues.city,
      state: defaultState.trim() || emptyValues.state,
    })
  }, [isOpen, addressToEdit, user, reset, defaultCity, defaultState, isChopsticks])

  const handleMapChange = (place: ResolvedPlace) => {
    const coords = { latitude: place.latitude, longitude: place.longitude }
    coordinatesRef.current = coords
    setPinnedCoords(coords)

    const current = getValues()
    const opts = { shouldValidate: true, shouldDirty: true }
    setValue(
      'addressLine1',
      place.addressLine1 || place.formattedAddress || current.addressLine1,
      opts,
    )
    setValue('addressLine2', place.addressLine2 || current.addressLine2, opts)
    setValue('landmark', place.landmark || current.landmark, opts)
    setValue('city', place.city || current.city || defaultCity.trim() || '', opts)
    setValue(
      'state',
      place.state || current.state || defaultState.trim() || '',
      opts,
    )
    setValue('pincode', place.pincode || current.pincode, opts)
  }

  // Delivery status derived from pin vs restaurant location
  const pinDistanceKm =
    pinnedCoords && restaurantLocation
      ? distanceToRestaurantKm(pinnedCoords.latitude, pinnedCoords.longitude, restaurantLocation)
      : null

  const maxKm =
    deliverySettings?.max_distance_km ??
    (isChopsticks ? ONAM_SADHYA.deliveryRadiusKm : NEARBY_DELIVERY_MAX_KM)
  const isOutOfRange = pinDistanceKm !== null && !isWithinNearbyDelivery(pinDistanceKm, maxKm)
  const outOfRangeMessage = isChopsticks
    ? onamDeliveryOutOfRangeMessage({
        distanceKm: pinDistanceKm,
        maxKm,
      })
    : `${pinDistanceKm?.toFixed(1) ?? ''} km away — outside delivery area (${maxKm} km max).`

  // Chopsticks Onam: still show estimated charge when outside the usual radius
  // (distance is FYI-only and must not block save).
  const deliveryChargePreview =
    pinnedCoords &&
    deliverySettings &&
    (!isOutOfRange || isChopsticks)
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

    const savedType =
      values.addressType === 'other'
        ? values.customLabel.trim() || 'Other'
        : values.addressType

    const payload: CreateAddressInput = {
      addressType: savedType,
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

    const validationMode = isChopsticks ? 'relaxed' : 'strict'

    const result =
      isEditing && addressToEdit
        ? await addressService.updateAddress(addressToEdit.id, payload, {
            validationMode,
          })
        : await addressService.addAddress(payload, { validationMode })

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
          <Button
            type="submit"
            form="address-form"
            disabled={isSubmitting}
            className="shrink-0"
          >
            {isSubmitting ? 'Saving…' : isEditing ? 'Update' : 'Save Address'}
          </Button>
        </div>
      }
    >
      <form id="address-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

        {/* ΓöÇΓöÇ Map pin ΓöÇΓöÇ */}
        <div className="space-y-2">
          <LocationPicker
            key={
              isEditing
                ? addressToEdit?.id ?? 'edit'
                : `locate-${locateSession}`
            }
            latitude={pinnedCoords?.latitude ?? null}
            longitude={pinnedCoords?.longitude ?? null}
            onChange={handleMapChange}
            autoLocateOnMount={isChopsticks && !isEditing}
            initialMode={
              (isEditing
                ? 'search'
                : isChopsticks
                  ? 'auto'
                  : 'search') as LocationMode
            }
          />

          {/* Delivery distance status badge ΓÇö only shown when pinned */}
          {pinnedCoords && restaurantLocation && pinDistanceKm !== null && (
            <div
              className={cn(
                'flex gap-2 rounded-lg px-3 py-2 text-xs font-medium',
                isOutOfRange ? 'items-start' : 'items-center',
                isOutOfRange
                  ? isChopsticks
                    ? 'bg-amber-50 text-amber-950'
                    : 'bg-red-50 text-red-700'
                  : 'bg-green-50 text-green-700',
              )}
              role={isOutOfRange && isChopsticks ? 'status' : undefined}
            >
              {isOutOfRange ? (
                <AlertCircle
                  className={cn(
                    'mt-0.5 h-3.5 w-3.5 shrink-0',
                    isChopsticks ? 'text-amber-700' : undefined,
                  )}
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              {isOutOfRange ? (
                <span className="leading-relaxed font-normal">{outOfRangeMessage}</span>
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

        {/* Save as — Home / Work / named place */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-secondary">
            Save as
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {ADDRESS_TYPE_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setValue('addressType', value, { shouldDirty: true })
                }
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
          {addressType === 'other' ? (
            <Input
              label="Name this place"
              placeholder="e.g. Mom's house, Client office, Gym"
              error={errors.customLabel?.message}
              value={customLabel}
              {...register('customLabel', {
                validate: (value) => {
                  if (getValues('addressType') !== 'other') return true
                  const name = value.trim()
                  if (name.length < 2) {
                    return 'Give this address a name so you can find it later'
                  }
                  if (name.length > 40) {
                    return 'Keep the name under 40 characters'
                  }
                  return true
                },
              })}
              onChange={(e) =>
                setValue('customLabel', e.target.value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />
          ) : null}
        </div>

        {/* Recipient — can be the customer or someone else */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={
              isChopsticks
                ? 'Recipient name (optional)'
                : 'Recipient name'
            }
            placeholder="Who should receive this order"
            error={errors.fullName?.message}
            {...register(
              'fullName',
              isChopsticks ? undefined : { required: 'Recipient name is required' },
            )}
          />
          <Input
            label={isChopsticks ? 'Recipient phone (optional)' : 'Recipient phone'}
            type="tel"
            inputMode="numeric"
            placeholder="10-digit mobile"
            error={errors.phone?.message}
            {...register(
              'phone',
              isChopsticks
                ? {
                    validate: (value) =>
                      !value.trim() ||
                      /^\d{10}$/.test(value) ||
                      'Enter a valid 10-digit number',
                  }
                : {
                    required: 'Recipient phone is required',
                    pattern: {
                      value: /^\d{10}$/,
                      message: 'Enter a valid 10-digit number',
                    },
                  },
            )}
          />
        </div>

        {/* Address line 1 */}
        <Input
          label={
            isChopsticks
              ? 'House / Flat, Street (optional)'
              : 'House / Flat, Street'
          }
          placeholder="e.g. 12B, MG Road"
          error={errors.addressLine1?.message}
          value={addressLine1}
          {...register(
            'addressLine1',
            isChopsticks ? undefined : { required: 'Address is required' },
          )}
          onChange={(e) =>
            setValue('addressLine1', e.target.value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />

        {/* Address line 2 + Landmark */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Floor / Area (optional)"
            placeholder="e.g. 3rd floor, Sobha Apts"
            value={addressLine2}
            {...register('addressLine2')}
            onChange={(e) =>
              setValue('addressLine2', e.target.value, { shouldDirty: true })
            }
          />
          <Input
            label={isChopsticks ? 'Landmark (optional)' : 'Landmark'}
            placeholder="Near metro / temple"
            error={errors.landmark?.message}
            value={landmark}
            {...register(
              'landmark',
              isChopsticks
                ? undefined
                : {
                    required: 'Landmark helps the delivery partner',
                    minLength: {
                      value: 2,
                      message: 'Enter a recognisable landmark',
                    },
                  },
            )}
            onChange={(e) =>
              setValue('landmark', e.target.value, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
        </div>

        {/* City / State / Pincode */}
        <div className="grid grid-cols-3 gap-3">
          <Input
            label={isChopsticks ? 'City (optional)' : 'City'}
            error={errors.city?.message}
            value={city}
            {...register(
              'city',
              isChopsticks ? undefined : { required: 'Required' },
            )}
            onChange={(e) =>
              setValue('city', e.target.value, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
          <Input
            label={isChopsticks ? 'State (optional)' : 'State'}
            error={errors.state?.message}
            value={state}
            {...register(
              'state',
              isChopsticks ? undefined : { required: 'Required' },
            )}
            onChange={(e) =>
              setValue('state', e.target.value, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
          <Input
            label={isChopsticks ? 'Pincode (optional)' : 'Pincode'}
            placeholder="6 digits"
            inputMode="numeric"
            error={errors.pincode?.message}
            value={pincode}
            {...register(
              'pincode',
              isChopsticks
                ? {
                    validate: (value) =>
                      !value.trim() ||
                      /^\d{6}$/.test(value) ||
                      '6-digit pincode',
                  }
                : {
                    required: 'Required',
                    pattern: {
                      value: /^\d{6}$/,
                      message: '6-digit pincode',
                    },
                  },
            )}
            onChange={(e) =>
              setValue('pincode', e.target.value, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
        </div>
      </form>
    </Modal>
  )
}
