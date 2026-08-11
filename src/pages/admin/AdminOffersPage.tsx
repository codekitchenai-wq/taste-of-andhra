import { useState } from 'react'
import { Plus } from 'lucide-react'
import { DeleteOfferModal } from '@/components/admin/DeleteOfferModal'
import { OfferFormModal } from '@/components/admin/OfferFormModal'
import { OfferTable } from '@/components/admin/OfferTable'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useOffers } from '@/hooks/useOffers'
import type { Offer } from '@/types/Offer'

export default function AdminOffersPage() {
  const { offers, isLoading, error, refetch } = useOffers()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
  const [deletingOffer, setDeletingOffer] = useState<Offer | null>(null)

  const openCreateModal = () => {
    setEditingOffer(null)
    setIsFormOpen(true)
  }

  const openEditModal = (offer: Offer) => {
    setEditingOffer(offer)
    setIsFormOpen(true)
  }

  const closeFormModal = () => {
    setIsFormOpen(false)
    setEditingOffer(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreateModal} className="shrink-0">
          <Plus className="h-4 w-4" />
          Add Offer
        </Button>
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && offers.length === 0 && (
        <EmptyState
          title="No offers yet"
          description="Create your first promotional offer."
          actionLabel="Add Offer"
          onAction={openCreateModal}
        />
      )}

      {!isLoading && !error && offers.length > 0 && (
        <OfferTable
          offers={offers}
          onEdit={openEditModal}
          onDelete={setDeletingOffer}
        />
      )}

      <OfferFormModal
        isOpen={isFormOpen}
        offer={editingOffer}
        onClose={closeFormModal}
        onSuccess={() => void refetch()}
      />

      <DeleteOfferModal
        offer={deletingOffer}
        onClose={() => setDeletingOffer(null)}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
