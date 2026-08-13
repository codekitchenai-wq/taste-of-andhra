import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { Branch, BranchFormInput } from '@/types/Branch'
import * as branchService from '@/services/branchService'

interface BranchFormValues {
  name: string
  slug: string
  phone: string
  email: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pincode: string
  gstin: string
  isActive: boolean
  isDefault: boolean
}

interface BranchFormModalProps {
  isOpen: boolean
  branch: Branch | null
  onClose: () => void
  onSuccess: () => void
}

export function BranchFormModal({
  isOpen,
  branch,
  onClose,
  onSuccess,
}: BranchFormModalProps) {
  const isEditing = Boolean(branch)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormValues>({
    defaultValues: {
      name: '',
      slug: '',
      phone: '',
      email: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      gstin: '',
      isActive: true,
      isDefault: false,
    },
  })

  useEffect(() => {
    if (!isOpen) return

    reset({
      name: branch?.name ?? '',
      slug: branch?.slug ?? '',
      phone: branch?.phone ?? '',
      email: branch?.email ?? '',
      addressLine1: branch?.address_line1 ?? '',
      addressLine2: branch?.address_line2 ?? '',
      city: branch?.city ?? '',
      state: branch?.state ?? '',
      pincode: branch?.pincode ?? '',
      gstin: branch?.gstin ?? '',
      isActive: branch?.is_active ?? true,
      isDefault: branch?.is_default ?? false,
    })
  }, [isOpen, branch, reset])

  const onSubmit = async (values: BranchFormValues) => {
    const payload: BranchFormInput = {
      name: values.name,
      slug: values.slug,
      phone: values.phone || undefined,
      email: values.email || undefined,
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2 || undefined,
      city: values.city,
      state: values.state,
      pincode: values.pincode,
      gstin: values.gstin || undefined,
      isActive: values.isActive,
      isDefault: values.isDefault,
    }

    const result = isEditing
      ? await branchService.updateBranch(branch!.id, payload)
      : await branchService.createBranch(payload)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(isEditing ? 'Branch updated' : 'Branch created')
    onSuccess()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Branch' : 'Add Branch'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Input
            label="Slug"
            error={errors.slug?.message}
            {...register('slug', { required: 'Slug is required' })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>
        <Input
          label="Address Line 1"
          error={errors.addressLine1?.message}
          {...register('addressLine1', { required: 'Address is required' })}
        />
        <Input
          label="Address Line 2"
          error={errors.addressLine2?.message}
          {...register('addressLine2')}
        />
        <div className="grid gap-4 sm:grid-cols-3">
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
          <Input
            label="Pincode"
            error={errors.pincode?.message}
            {...register('pincode', { required: 'Pincode is required' })}
          />
        </div>
        <Input
          label="GSTIN (optional)"
          error={errors.gstin?.message}
          {...register('gstin')}
        />
        <p className="-mt-2 text-xs text-text-secondary">
          Used on invoices when GST is enabled in Settings. Leave blank if this
          branch is not GST-registered.
        </p>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isActive')} />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isDefault')} />
            Default branch
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving...'
              : isEditing
                ? 'Save Changes'
                : 'Create Branch'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
