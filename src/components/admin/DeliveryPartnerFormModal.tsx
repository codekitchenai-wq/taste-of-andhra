import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import * as deliveryPartnerService from '@/services/deliveryPartnerService'
import type { DeliveryPartner } from '@/types/DeliveryPartner'

interface DeliveryPartnerFormValues {
  fullName: string
  phone: string
  notes: string
  isActive: boolean
}

interface DeliveryPartnerFormModalProps {
  isOpen: boolean
  partner: DeliveryPartner | null
  onClose: () => void
  onSuccess: () => void
}

export function DeliveryPartnerFormModal({
  isOpen,
  partner,
  onClose,
  onSuccess,
}: DeliveryPartnerFormModalProps) {
  const isEditing = Boolean(partner)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeliveryPartnerFormValues>({
    defaultValues: {
      fullName: '',
      phone: '',
      notes: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (!isOpen) return

    reset({
      fullName: partner?.full_name ?? '',
      phone: partner?.phone ?? '',
      notes: partner?.notes ?? '',
      isActive: partner?.is_active ?? true,
    })
  }, [isOpen, partner, reset])

  const onSubmit = async (values: DeliveryPartnerFormValues) => {
    const payload = {
      fullName: values.fullName,
      phone: values.phone,
      notes: values.notes || undefined,
      isActive: values.isActive,
    }

    const result = isEditing
      ? await deliveryPartnerService.updateDeliveryPartner(partner!.id, payload)
      : await deliveryPartnerService.createDeliveryPartner(payload)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(isEditing ? 'Delivery partner updated' : 'Delivery partner added')
    onSuccess()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Delivery Partner' : 'Add Delivery Partner'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Partner Name"
          placeholder="e.g. Ravi Kumar"
          error={errors.fullName?.message}
          {...register('fullName', { required: 'Name is required' })}
        />
        <Input
          label="Partner Phone"
          inputMode="numeric"
          placeholder="10-digit mobile number"
          error={errors.phone?.message}
          {...register('phone', {
            required: 'Phone is required',
            pattern: {
              value: /^(\+?91)?\s?\d{10}$/,
              message: 'Enter a valid 10-digit phone number',
            },
          })}
        />
        <Input
          label="Notes (optional)"
          placeholder="e.g. Bike, evening shifts"
          error={errors.notes?.message}
          {...register('notes')}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isActive')} />
          Active (available for assignment)
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving...'
              : isEditing
                ? 'Save Changes'
                : 'Add Partner'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
