import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import * as offerService from '@/services/offerService'
import type { Offer } from '@/types/Offer'

interface DeleteOfferModalProps {
  offer: Offer | null
  onClose: () => void
  onSuccess: () => void
}

export function DeleteOfferModal({
  offer,
  onClose,
  onSuccess,
}: DeleteOfferModalProps) {
  if (!offer) return null

  const handleDelete = async () => {
    const result = await offerService.deleteOffer(offer.id)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Offer deleted')
    onSuccess()
    onClose()
  }

  return (
    <Modal isOpen={Boolean(offer)} onClose={onClose} title="Delete Offer">
      <p className="text-sm text-text-secondary">
        Are you sure you want to delete{' '}
        <span className="font-medium text-text-primary">{offer.title}</span>?
        This will deactivate the offer.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={handleDelete}>
          Delete Offer
        </Button>
      </div>
    </Modal>
  )
}
