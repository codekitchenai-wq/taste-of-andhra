import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    defaultValues: {
      name: '',
      description: '',
      displayOrder: 0,
      isActive: true,
    },
  })

  useEffect(() => {
    if (!isOpen) return

    setImageFile(null)
    setImagePreview(category?.image_url ?? null)
    setImageRemoved(false)

    reset({
      name: category?.name ?? '',
      description: category?.description ?? '',
      displayOrder: category?.display_order ?? 0,
      isActive: category?.is_active ?? true,
    })
  }, [isOpen, category, reset])

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setImageRemoved(false)
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageRemoved(true)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSubmit = async (values: CategoryFormValues) => {
    const payload: CategoryFormInput = {
      name: values.name,
      description: values.description,
      displayOrder: Number(values.displayOrder),
      isActive: values.isActive,
      ...(imageFile || imageRemoved
        ? {
            imageFile,
            imageUrl: imageRemoved ? '' : undefined,
          }
        : {}),
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

        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">Image</p>
          {imagePreview ? (
            <div className="relative mb-3 overflow-hidden rounded-[var(--radius-input)]">
              <img
                src={imagePreview}
                alt="Category preview"
                className="h-40 w-full object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mb-3 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-input)] border border-dashed border-gray-300 text-text-secondary hover:border-primary hover:text-primary"
            >
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm">Upload category image</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImageChange}
          />
          <p className="text-xs text-text-secondary">
            Uploads go to Supabase Storage under categories/ (same layout as
            public/images). JPEG, PNG, or WebP, max 5 MB.
          </p>
        </div>

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
