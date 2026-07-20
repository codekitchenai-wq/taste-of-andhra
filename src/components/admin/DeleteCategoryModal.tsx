import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import * as categoryService from '@/services/categoryService'
import type { Category } from '@/types/Category'

interface DeleteCategoryModalProps {
  category: Category | null
  onClose: () => void
  onSuccess: () => void
}

export function DeleteCategoryModal({
  category,
  onClose,
  onSuccess,
}: DeleteCategoryModalProps) {
  if (!category) return null

  const handleDelete = async () => {
    const result = await categoryService.deleteCategory(category.id)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Category deleted')
    onSuccess()
    onClose()
  }

  return (
    <Modal isOpen={Boolean(category)} onClose={onClose} title="Delete Category">
      <p className="text-sm text-text-secondary">
        Are you sure you want to delete{' '}
        <span className="font-medium text-text-primary">{category.name}</span>?
        This will deactivate the category. It will no longer appear on the menu.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={handleDelete}>
          Delete Category
        </Button>
      </div>
    </Modal>
  )
}
