import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { Offer } from '@/types/Offer'
import { formatDate } from '@/utils/format'

interface OfferTableProps {
  offers: Offer[]
  onEdit: (offer: Offer) => void
  onDelete: (offer: Offer) => void
}

export function OfferTable({ offers, onEdit, onDelete }: OfferTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-black/5 bg-background/60">
          <tr>
            <th className="px-4 py-3 font-semibold text-text-primary">Offer</th>
            <th className="px-4 py-3 font-semibold text-text-primary">
              Discount
            </th>
            <th className="px-4 py-3 font-semibold text-text-primary">Code</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Period</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Status</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr
              key={offer.id}
              className="border-b border-black/5 last:border-b-0"
            >
              <td className="px-4 py-4">
                <p className="font-medium text-text-primary">{offer.title}</p>
                {offer.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">
                    {offer.description}
                  </p>
                )}
              </td>
              <td className="px-4 py-4 font-medium text-text-primary">
                {offer.discount_percentage}%
              </td>
              <td className="px-4 py-4 text-text-secondary">
                {offer.coupon_code ?? '—'}
              </td>
              <td className="px-4 py-4 text-text-secondary">
                {formatDate(offer.start_date)} –{' '}
                {formatDate(offer.end_date)}
              </td>
              <td className="px-4 py-4">
                <Badge variant={offer.is_active ? 'veg' : 'unavailable'}>
                  {offer.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(offer)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
                    aria-label={`Edit ${offer.title}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(offer)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
                    aria-label={`Delete ${offer.title}`}
                    disabled={!offer.is_active}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
