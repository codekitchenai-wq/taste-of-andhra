import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { AdminOrder } from '@/services/orderService'
import * as deliveryService from '@/services/deliveryService'

interface AssignDeliveryModalProps {
  order: AdminOrder | null
  onClose: () => void
  onSuccess: () => void
}

interface FormValues {
  deliveryPartner: string
  partnerPhone: string
}

export function AssignDeliveryModal({
  order,
  onClose,
  onSuccess,
}: AssignDeliveryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      deliveryPartner: '',
      partnerPhone: '',
    },
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (values: FormValues) => {
    if (!order) return

    setIsSubmitting(true)

    const result = await deliveryService.assignDelivery({
      orderId: order.id,
      deliveryPartner: values.deliveryPartner,
      partnerPhone: values.partnerPhone,
    })

    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Delivery partner assigned')
    reset()
    onSuccess()
  }

  return (
    <Modal
      isOpen={Boolean(order)}
      onClose={handleClose}
      title="Assign Delivery Partner"
    >
      {order && (
        <p className="mb-4 text-sm text-text-secondary">
          Assign a partner for order {order.order_number}
        </p>
      )}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <Input
          label="Partner Name"
          error={errors.deliveryPartner?.message}
          {...register('deliveryPartner', {
            required: 'Partner name is required',
          })}
        />
        <Input
          label="Partner Phone"
          inputMode="numeric"
          placeholder="10-digit mobile number"
          error={errors.partnerPhone?.message}
          {...register('partnerPhone', {
            required: 'Phone is required',
            pattern: {
              value: /^\d{10}$/,
              message: 'Enter a valid 10-digit phone number',
            },
          })}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Assigning...' : 'Assign Partner'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
