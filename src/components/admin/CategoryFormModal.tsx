import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import type { CategoryFormInput } from '@/services/categoryService'
import * as categoryService from '@/services/categoryService'
import type { Category } from '@/types/Category'

interface CategoryFormValues {
  name: string
  description: string
  imageUrl: string
  displayOrder: number
  isActive: boolean
}

interface CategoryFormModalProps {
  isOpen: boolean
  category: Category | null
  onClose: () => void
  onSuccess: () => void
}

export function CategoryFormModal({
  isOpen,
  category,
  onClose,
  onSuccess,
}: CategoryFormModalProps) {
  const isEditing = Boolean(category)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    defaultValues: {
      name: '',
      description: '',
      imageUrl: '',
      displayOrder: 0,
      isActive: true,
    },
  })

  useEffect(() => {
    if (!isOpen) return

    reset({
      name: category?.name ?? '',
      description: category?.description ?? '',
      imageUrl: category?.image_url ?? '',
      displayOrder: category?.display_order ?? 0,
      isActive: category?.is_active ?? true,
    })
  }, [isOpen, category, reset])

  const onSubmit = async (values: CategoryFormValues) => {
    const payload: CategoryFormInput = {
      name: values.name,
      description: values.description,
      imageUrl: values.imageUrl,
      displayOrder: Number(values.displayOrder),
      isActive: values.isActive,
    }

    const result = isEditing
      ? await categoryService.updateCategory(category!.id, payload)
      : await categoryService.createCategory(payload)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(isEditing ? 'Category updated' : 'Category created')
    onSuccess()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Category' : 'Add Category'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Name"
          error={errors.name?.message}
          {...register('name', { required: 'Name is required' })}
        />
        <Textarea
          label="Description"
          error={errors.description?.message}
          {...register('description')}
        />
        <Input
          label="Image URL"
          type="url"
          placeholder="https://example.com/image.jpg"
          error={errors.imageUrl?.message}
          {...register('imageUrl')}
        />
        <Input
          label="Display Order"
          type="number"
          min={0}
          error={errors.displayOrder?.message}
          {...register('displayOrder', {
            valueAsNumber: true,
            min: { value: 0, message: 'Must be 0 or greater' },
          })}
        />
        {isEditing && (
          <label className="flex items-center gap-3 text-sm text-text-primary">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              {...register('isActive')}
            />
            Active category
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
                : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
