import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import type { OfferFormInput } from '@/services/offerService'
import * as offerService from '@/services/offerService'
import type { Offer } from '@/types/Offer'

interface OfferFormValues {
  title: string
  description: string
  discountPercentage: number
  minimumOrder: number
  couponCode: string
  startDate: string
  endDate: string
  isActive: boolean
}

interface OfferFormModalProps {
  isOpen: boolean
  offer: Offer | null
  onClose: () => void
  onSuccess: () => void
}

export function OfferFormModal({
  isOpen,
  offer,
  onClose,
  onSuccess,
}: OfferFormModalProps) {
  const isEditing = Boolean(offer)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OfferFormValues>({
    defaultValues: {
      title: '',
      description: '',
      discountPercentage: 10,
      minimumOrder: 0,
      couponCode: '',
      startDate: '',
      endDate: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (!isOpen) return

    reset({
      title: offer?.title ?? '',
      description: offer?.description ?? '',
      discountPercentage: offer?.discount_percentage ?? 10,
      minimumOrder: offer?.minimum_order ?? 0,
      couponCode: offer?.coupon_code ?? '',
      startDate: offer?.start_date ?? '',
      endDate: offer?.end_date ?? '',
      isActive: offer?.is_active ?? true,
    })
  }, [isOpen, offer, reset])

  const onSubmit = async (values: OfferFormValues) => {
    const payload: OfferFormInput = {
      title: values.title,
      description: values.description,
      discountPercentage: Number(values.discountPercentage),
      minimumOrder: Number(values.minimumOrder),
      couponCode: values.couponCode,
      startDate: values.startDate,
      endDate: values.endDate,
      isActive: values.isActive,
    }

    const result = isEditing
      ? await offerService.updateOffer(offer!.id, payload)
      : await offerService.createOffer(payload)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(isEditing ? 'Offer updated' : 'Offer created')
    onSuccess()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Offer' : 'Add Offer'}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Title"
          error={errors.title?.message}
          {...register('title', { required: 'Title is required' })}
        />
        <Textarea label="Description" {...register('description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Discount (%)"
            type="number"
            min={1}
            max={100}
            error={errors.discountPercentage?.message}
            {...register('discountPercentage', {
              required: 'Discount is required',
              valueAsNumber: true,
              min: { value: 1, message: 'Minimum 1%' },
              max: { value: 100, message: 'Maximum 100%' },
            })}
          />
          <Input
            label="Minimum Order (₹)"
            type="number"
            min={0}
            {...register('minimumOrder', { valueAsNumber: true, min: 0 })}
          />
        </div>
        <Input label="Coupon Code" {...register('couponCode')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Start Date"
            type="date"
            error={errors.startDate?.message}
            {...register('startDate', { required: 'Start date is required' })}
          />
          <Input
            label="End Date"
            type="date"
            error={errors.endDate?.message}
            {...register('endDate', { required: 'End date is required' })}
          />
        </div>
        {isEditing && (
          <label className="flex items-center gap-3 text-sm text-text-primary">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              {...register('isActive')}
            />
            Active offer
          </label>
        )}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving...'
              : isEditing
                ? 'Save Changes'
                : 'Create Offer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
