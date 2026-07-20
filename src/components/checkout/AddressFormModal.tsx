import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { ADDRESS_TYPES } from '@/constants/ORDER'
import type { CreateAddressInput } from '@/services/addressService'
import * as addressService from '@/services/addressService'

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
}

export function AddressFormModal({
  isOpen,
  onClose,
  onSuccess,
}: AddressFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    defaultValues: {
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
    },
  })

  useEffect(() => {
    if (!isOpen) return

    reset({
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
    })
  }, [isOpen, reset])

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
      isDefault: values.isDefault,
    }

    const result = await addressService.addAddress(payload)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Address saved')
    onSuccess(result.data.id)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Delivery Address">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

        <Input
          label="Address Line 1"
          error={errors.addressLine1?.message}
          {...register('addressLine1', { required: 'Address is required' })}
        />

        <Input label="Address Line 2" {...register('addressLine2')} />

        <Input label="Landmark" {...register('landmark')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="City"
            error={errors.city?.message}
            {...register('city', { required: 'City is required' })}
          />
          <Input
            label="State"
            error={errors.state?.message}
            {...register('state', { required: 'State is required' })}
          />
        </div>

        <Input
          label="Pincode"
          error={errors.pincode?.message}
          {...register('pincode', {
            required: 'Pincode is required',
            pattern: {
              value: /^\d{6}$/,
              message: 'Enter a valid 6-digit pincode',
            },
          })}
        />

        <label className="flex items-center gap-3 text-sm text-text-primary">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            {...register('isDefault')}
          />
          Set as default address
        </label>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Address'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
