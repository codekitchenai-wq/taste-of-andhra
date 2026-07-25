import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import type { AdminOrder } from '@/services/orderService'
import * as deliveryService from '@/services/deliveryService'
import * as deliveryPartnerService from '@/services/deliveryPartnerService'
import { formatIndianPhone } from '@/utils/phone'

interface AssignDeliveryModalProps {
  order: AdminOrder | null
  onClose: () => void
  onSuccess: () => void
}

interface FormValues {
  partnerSelection: string
  deliveryPartner: string
  partnerPhone: string
}

interface PartnerOption {
  key: string
  source: 'roster' | 'profile'
  userId: string | null
  full_name: string
  phone: string | null
}

export function AssignDeliveryModal({
  order,
  onClose,
  onSuccess,
}: AssignDeliveryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [partners, setPartners] = useState<PartnerOption[]>([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      partnerSelection: '',
      deliveryPartner: '',
      partnerPhone: '',
    },
  })

  const partnerSelection = watch('partnerSelection')

  useEffect(() => {
    if (!order) return

    const loadPartners = async () => {
      const [rosterResult, profileResult] = await Promise.all([
        deliveryPartnerService.getActiveDeliveryPartners(),
        deliveryService.getDeliveryPartners(),
      ])

      const options: PartnerOption[] = []
      const seenPhones = new Set<string>()

      if (rosterResult.success) {
        for (const partner of rosterResult.data) {
          const digits = partner.phone.replace(/\D/g, '').slice(-10)
          if (digits) seenPhones.add(digits)
          options.push({
            key: `roster:${partner.id}`,
            source: 'roster',
            userId: null,
            full_name: partner.full_name,
            phone: partner.phone,
          })
        }
      }

      if (profileResult.success) {
        for (const partner of profileResult.data) {
          const digits = partner.phone?.replace(/\D/g, '').slice(-10) ?? ''
          if (digits && seenPhones.has(digits)) continue
          options.push({
            key: `profile:${partner.id}`,
            source: 'profile',
            userId: partner.id,
            full_name: partner.full_name,
            phone: partner.phone,
          })
        }
      }

      setPartners(options)
    }

    void loadPartners()
  }, [order])

  useEffect(() => {
    if (!partnerSelection) return

    const partner = partners.find((item) => item.key === partnerSelection)
    if (!partner) return

    setValue('deliveryPartner', partner.full_name)
    setValue('partnerPhone', partner.phone?.replace(/\D/g, '').slice(-10) ?? '')
  }, [partnerSelection, partners, setValue])

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (values: FormValues) => {
    if (!order) return

    setIsSubmitting(true)

    const selected = partners.find(
      (item) => item.key === values.partnerSelection,
    )

    const result = await deliveryService.assignDelivery({
      orderId: order.id,
      deliveryPartner: values.deliveryPartner,
      partnerPhone: values.partnerPhone,
      partnerUserId: selected?.userId ?? undefined,
    })

    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(
      order.order_status === 'ready'
        ? 'Partner assigned — order is out for delivery'
        : 'Partner assigned — order stays in kitchen until ready',
    )
    reset()
    onSuccess()
  }

  const partnerOptions = partners.map((partner) => ({
    label: `${partner.full_name}${
      partner.phone ? ` · ${formatIndianPhone(partner.phone)}` : ''
    }`,
    value: partner.key,
  }))

  return (
    <Modal
      isOpen={Boolean(order)}
      onClose={handleClose}
      title="Assign Delivery Partner"
    >
      {order && (
        <p className="mb-4 text-sm text-text-secondary">
          Assign a partner for order {order.order_number}.
          {order.order_status === 'ready'
            ? ' This will mark the order out for delivery.'
            : ' The order will stay in its current kitchen status until it is ready.'}
        </p>
      )}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <Select
          label="Select Partner (optional)"
          placeholder="Choose from delivery partners"
          options={partnerOptions}
          {...register('partnerSelection')}
        />
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
