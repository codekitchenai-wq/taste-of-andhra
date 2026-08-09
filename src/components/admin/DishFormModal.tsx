import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { DishModifiersEditor } from '@/components/admin/DishModifiersEditor'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { SPICE_LEVEL, SPICE_LEVEL_LIST } from '@/constants/SPICE_LEVEL'
import type { DishFormInput } from '@/services/dishService'
import * as dishService from '@/services/dishService'
import type { Category } from '@/types/Category'
import type { SpiceLevel } from '@/types/enums'
import type { DishWithCategory } from '@/utils/mapDish'

interface DishFormValues {
  name: string
  description: string
  ingredients: string
  categoryId: string
  price: number
  calories: string
  preparationTime: string
  spiceLevel: SpiceLevel | ''
  isVeg: boolean
  isAvailable: boolean
  isFeatured: boolean
}

interface DishFormModalProps {
  isOpen: boolean
  dish: DishWithCategory | null
  categories: Category[]
  onClose: () => void
  onSuccess: () => void
}

export function DishFormModal({
  isOpen,
  dish,
  categories,
  onClose,
  onSuccess,
}: DishFormModalProps) {
  const isEditing = Boolean(dish)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DishFormValues>({
    defaultValues: {
      name: '',
      description: '',
      ingredients: '',
      categoryId: '',
      price: 0,
      calories: '',
      preparationTime: '',
      spiceLevel: '',
      isVeg: true,
      isAvailable: true,
      isFeatured: false,
    },
  })

  const categoryOptions = categories
    .filter((category) => category.is_active)
    .map((category) => ({
      label: category.name,
      value: category.id,
    }))

  const spiceOptions = SPICE_LEVEL_LIST.map((level) => ({
    label: SPICE_LEVEL[level],
    value: level,
  }))

  useEffect(() => {
    if (!isOpen) return

    setImageFile(null)
    setImagePreview(dish?.image_url ?? null)
    setImageRemoved(false)

    reset({
      name: dish?.name ?? '',
      description: dish?.description ?? '',
      ingredients: dish?.ingredients ?? '',
      categoryId: dish?.category_id ?? '',
      price: dish?.price ?? 0,
      calories: dish?.calories != null ? String(dish.calories) : '',
      preparationTime:
        dish?.preparation_time != null ? String(dish.preparation_time) : '',
      spiceLevel: dish?.spice_level ?? '',
      isVeg: dish?.is_veg ?? true,
      isAvailable: dish?.is_available ?? true,
      isFeatured: dish?.is_featured ?? false,
    })
  }, [isOpen, dish, reset])

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

  const onSubmit = async (values: DishFormValues) => {
    const payload: DishFormInput = {
      name: values.name,
      description: values.description,
      ingredients: values.ingredients,
      categoryId: values.categoryId,
      price: Number(values.price),
      calories: values.calories ? Number(values.calories) : undefined,
      preparationTime: values.preparationTime
        ? Number(values.preparationTime)
        : undefined,
      spiceLevel: values.spiceLevel || null,
      isVeg: values.isVeg,
      isAvailable: values.isAvailable,
      isFeatured: values.isFeatured,
      ...(imageFile || imageRemoved
        ? {
            imageFile,
            imageUrl: imageRemoved ? '' : undefined,
          }
        : {}),
    }

    const result = isEditing
      ? await dishService.updateDish(dish!.id, payload)
      : await dishService.createDish(payload)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(isEditing ? 'Dish updated' : 'Dish created')
    onSuccess()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Dish' : 'Add Dish'}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Name"
          error={errors.name?.message}
          {...register('name', { required: 'Name is required' })}
        />

        <Select
          label="Category"
          placeholder="Select a category"
          options={categoryOptions}
          error={errors.categoryId?.message}
          {...register('categoryId', { required: 'Category is required' })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Price (₹)"
            type="number"
            min={1}
            step="0.01"
            error={errors.price?.message}
            {...register('price', {
              required: 'Price is required',
              valueAsNumber: true,
              min: { value: 0.01, message: 'Price must be greater than zero' },
            })}
          />
          <Select
            label="Spice Level"
            placeholder="None"
            options={spiceOptions}
            {...register('spiceLevel')}
          />
        </div>

        <Textarea
          label="Description"
          error={errors.description?.message}
          {...register('description')}
        />

        <Textarea
          label="Ingredients"
          placeholder="Comma-separated ingredients"
          error={errors.ingredients?.message}
          {...register('ingredients')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Calories"
            type="number"
            min={0}
            error={errors.calories?.message}
            {...register('calories')}
          />
          <Input
            label="Preparation Time (minutes)"
            type="number"
            min={0}
            error={errors.preparationTime?.message}
            {...register('preparationTime')}
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium text-text-primary">Image</span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {imagePreview ? (
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[var(--radius-input)] border border-gray-200">
                <img
                  src={imagePreview}
                  alt="Dish preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-dashed border-gray-300 bg-background text-text-secondary">
                <ImagePlus className="h-8 w-8" aria-hidden="true" />
              </div>
            )}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-[var(--radius-input)] file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
              />
              <p className="mt-1 text-xs text-text-secondary">
                Uploads go to Supabase Storage under dishes/. JPEG, PNG, or WebP.
                Max 5 MB.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <label className="flex items-center gap-3 text-sm text-text-primary">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              {...register('isVeg')}
            />
            Vegetarian
          </label>
          <label className="flex items-center gap-3 text-sm text-text-primary">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              {...register('isFeatured')}
            />
            Featured
          </label>
          <label className="flex items-center gap-3 text-sm text-text-primary">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              {...register('isAvailable')}
            />
            Available
          </label>
        </div>

        {isEditing && dish && (
          <DishModifiersEditor dishId={dish.id} />
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
                : 'Create Dish'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
