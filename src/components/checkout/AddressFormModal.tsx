import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { LocationPicker } from '@/components/checkout/LocationPicker'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { ADDRESS_TYPES } from '@/constants/ORDER'
import { useAuth } from '@/hooks/useAuth'
import type { CreateAddressInput } from '@/services/addressService'
import * as addressService from '@/services/addressService'
import type { Address } from '@/types/Address'
import { isGoogleMapsConfigured, type ResolvedPlace } from '@/utils/googleMaps'
import { hasLocationPin } from '@/utils/mapAddress'

const PIN_REQUIRED_MESSAGE =
  'Pin your location on the map so we can check delivery and calculate shipping.'

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
}: AddressFormModalProps) {
  const isEditing = Boolean(addressToEdit)
  const { user } = useAuth()
  const [coordinates, setCoordinates] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [pinError, setPinError] = useState<string | undefined>()
  const pinRequired = isGoogleMapsConfigured

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
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

    if (addressToEdit) {
      reset(toFormValues(addressToEdit))
      setCoordinates(
        hasLocationPin(addressToEdit)
          ? {
              latitude: addressToEdit.latitude,
              longitude: addressToEdit.longitude,
            }
          : null,
      )
      setPinError(undefined)
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
    setPinError(undefined)
  }, [isOpen, addressToEdit, user, reset])

  // Pin fills the form; customers can still edit every field afterwards.
  const handlePlaceSelected = (place: ResolvedPlace) => {
    setCoordinates({ latitude: place.latitude, longitude: place.longitude })
    setPinError(undefined)

    const current = getValues()
    reset(
      {
        ...current,
        addressLine1:
          place.addressLine1 || place.formattedAddress || current.addressLine1,
        addressLine2: place.addressLine2 || current.addressLine2,
        landmark: place.landmark || current.landmark,
        city: place.city || current.city,
        state: place.state || current.state,
        pincode: place.pincode || current.pincode,
      },
      { keepDefaultValues: true },
    )
  }

  const onSubmit = async (values: AddressFormValues) => {
    if (pinRequired && !hasLocationPin(coordinates)) {
      setPinError(PIN_REQUIRED_MESSAGE)
      toast.error('Please pin your location on the map')
      return
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
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
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
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-primary">
            Pin your location
            {pinRequired ? (
              <span className="text-error" aria-hidden="true">
                {' '}
                *
              </span>
            ) : null}
          </p>
          <p className="text-xs text-text-secondary">
            Search, use your current location, or tap the map. We use this pin
            to check if we deliver and to calculate shipping.
          </p>
          <LocationPicker
            latitude={coordinates?.latitude ?? null}
            longitude={coordinates?.longitude ?? null}
            onChange={handlePlaceSelected}
            required={pinRequired}
            error={pinError}
          />
        </div>

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

        <p className="text-xs text-text-secondary">
          Pin fills these fields automatically. Change house number, landmark,
          or any detail before saving.
        </p>

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
