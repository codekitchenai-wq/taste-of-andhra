import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import * as dishService from '@/services/dishService'
import type { DishWithCategory } from '@/utils/mapDish'

interface DeleteDishModalProps {
  dish: DishWithCategory | null
  onClose: () => void
  onSuccess: () => void
}

export function DeleteDishModal({
  dish,
  onClose,
  onSuccess,
}: DeleteDishModalProps) {
  if (!dish) return null

  const handleDelete = async () => {
    const result = await dishService.deleteDish(dish.id)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Dish deleted')
    onSuccess()
    onClose()
  }

  return (
    <Modal isOpen={Boolean(dish)} onClose={onClose} title="Delete Dish">
      <p className="text-sm text-text-secondary">
        Are you sure you want to delete{' '}
        <span className="font-medium text-text-primary">{dish.name}</span>?
        This will mark the dish as unavailable. It will no longer appear on the
        menu.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={handleDelete}>
          Delete Dish
        </Button>
      </div>
    </Modal>
  )
}
