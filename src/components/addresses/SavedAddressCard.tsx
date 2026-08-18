import { MapPin, Pencil, Star, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatAddressLine } from '@/utils/mapAddress'
import type { Address } from '@/types/Address'

interface SavedAddressCardProps {
  address: Address
  onEdit: (address: Address) => void
  onDelete: (address: Address) => void
  onSetDefault: (address: Address) => void
  isBusy?: boolean
}

export function SavedAddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isBusy = false,
}: SavedAddressCardProps) {
  return (
    <article className="rounded-[var(--radius-card)] border border-black/5 bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-text-primary">{address.full_name}</h3>
            <Badge variant="default">{address.address_type}</Badge>
            {address.is_default && <Badge variant="featured">Default</Badge>}
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            {formatAddressLine(address)}
          </p>
          {address.landmark && (
            <p className="mt-1 text-sm text-text-secondary">
              Landmark: {address.landmark}
            </p>
          )}
          <p className="mt-1 text-sm text-text-secondary">
            Pincode: {address.pincode}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{address.phone}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-black/5 pt-4">
        {!address.is_default && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isBusy}
            onClick={() => onSetDefault(address)}
          >
            <Star className="h-4 w-4" aria-hidden="true" />
            Set Default
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={() => onEdit(address)}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBusy}
          className="text-error hover:bg-error/10 hover:text-error"
          onClick={() => onDelete(address)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete
        </Button>
      </div>
    </article>
  )
}
