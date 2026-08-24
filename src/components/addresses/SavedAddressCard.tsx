import { MapPin, Navigation, Pencil, Star, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatAddressLabel, formatAddressLine } from '@/utils/mapAddress'
import type { Address } from '@/types/Address'

interface SavedAddressCardProps {
  address: Address
  onEdit: (address: Address) => void
  onDelete: (address: Address) => void
  onSetDefault: (address: Address) => void
  isBusy?: boolean
  compact?: boolean
}

export function SavedAddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isBusy = false,
  compact = false,
}: SavedAddressCardProps) {
  return (
    <article
      className={
        compact
          ? 'rounded-xl border border-black/[0.06] bg-background p-4'
          : 'rounded-[var(--radius-card)] border border-black/5 bg-surface p-5 shadow-sm'
      }
    >
      <div className="flex items-start gap-3">
        <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-text-primary">
              {formatAddressLabel(address.address_type)}
            </h3>
            {address.is_default && <Badge variant="featured">Default</Badge>}
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Deliver to {address.full_name}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {formatAddressLine(address)}
          </p>
          {address.landmark && (
            <p className="mt-1 text-sm text-text-secondary">
              Landmark: {address.landmark}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-text-secondary">
            <span>Pincode: {address.pincode}</span>
            {address.distance_km != null && (
              <span className="flex items-center gap-1 text-xs">
                <Navigation className="h-3 w-3 shrink-0" aria-hidden="true" />
                ~{address.distance_km.toFixed(1)} km from restaurant
              </span>
            )}
          </div>
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
