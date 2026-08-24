import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { MIN_PASSWORD_LENGTH } from '@/constants/AUTH'
import { useOrganization } from '@/contexts/OrganizationContext'
import * as branchService from '@/services/branchService'
import * as deliveryPartnerService from '@/services/deliveryPartnerService'
import type { DeliveryPartner } from '@/types/DeliveryPartner'
import { normalizeIndianPhone } from '@/utils/phone'

interface DeliveryPartnerFormValues {
  fullName: string
  phone: string
  notes: string
  isActive: boolean
  branchId: string
  email: string
  password: string
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
  const org = useOrganization()
  const [branchOptions, setBranchOptions] = useState<
    { label: string; value: string }[]
  >([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DeliveryPartnerFormValues>({
    defaultValues: {
      fullName: '',
      phone: '',
      notes: '',
      isActive: true,
      branchId: '',
      email: '',
      password: '',
    },
  })

  const phoneValue = watch('phone')

  useEffect(() => {
    if (!isOpen) return

    const loadBranches = async () => {
      const result = await branchService.getActiveBranches()
      if (!result.success) {
        setBranchOptions([])
        return
      }

      setBranchOptions(
        result.data.map((branch) => ({
          label: branch.is_default ? `${branch.name} (default)` : branch.name,
          value: branch.id,
        })),
      )
    }

    void loadBranches()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    reset({
      fullName: partner?.full_name ?? '',
      phone: partner?.phone ?? '',
      notes: partner?.notes ?? '',
      isActive: partner?.is_active ?? true,
      branchId: partner?.branch_id ?? '',
      email: partner?.login_email ?? '',
      password: '',
    })
  }, [isOpen, partner, reset])

  useEffect(() => {
    if (!isOpen || isEditing) return
    const suggested = deliveryPartnerService.suggestedDeliveryLoginEmail(
      phoneValue,
      org.slug,
    )
    if (suggested) {
      setValue('email', suggested, { shouldValidate: false })
    }
  }, [isOpen, isEditing, phoneValue, org.slug, setValue])

  const onSubmit = async (values: DeliveryPartnerFormValues) => {
    const phone = normalizeIndianPhone(values.phone) ?? values.phone
    const payload = {
      fullName: values.fullName,
      phone,
      notes: values.notes || undefined,
      isActive: values.isActive,
      branchId: values.branchId || null,
      email: values.email.trim(),
      password: values.password || undefined,
    }

    const result = isEditing
      ? await deliveryPartnerService.updateDeliveryPartner(partner!.id, payload)
      : await deliveryPartnerService.createDeliveryPartner(payload)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(
      isEditing
        ? 'Delivery partner updated'
        : 'Delivery partner and login created',
    )
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
        <Select
          label="Branch"
          options={[
            { label: 'All branches (shared)', value: '' },
            ...branchOptions,
          ]}
          error={errors.branchId?.message}
          {...register('branchId')}
        />
        <Input
          label="Notes (optional)"
          placeholder="e.g. Bike, evening shifts"
          error={errors.notes?.message}
          {...register('notes')}
        />

        <div className="rounded-[var(--radius-button)] bg-background p-3">
          <p className="text-sm font-semibold text-text-primary">
            Delivery login
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Partners sign in at /delivery/login with this email and password.
            Suggested email uses their mobile number.
          </p>
        </div>

        <Input
          label="Login Email"
          type="email"
          autoComplete="off"
          placeholder="7760071234@chopsticksspicemalabar.test"
          error={errors.email?.message}
          {...register('email', {
            required: isEditing
              ? partner?.has_login
                ? 'Login email is required'
                : false
              : 'Login email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Enter a valid email address',
            },
          })}
        />
        <Input
          label={
            isEditing
              ? 'New Password (leave blank to keep current)'
              : 'Password'
          }
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: isEditing ? false : 'Password is required',
            minLength: {
              value: MIN_PASSWORD_LENGTH,
              message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
            },
            validate: (value) => {
              if (!value) return true
              return (
                value.length >= MIN_PASSWORD_LENGTH ||
                `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
              )
            },
          })}
        />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isActive')} />
          Active (available for assignment and can sign in)
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
