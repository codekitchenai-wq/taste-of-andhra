import { MapPin, Pencil, Navigation } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatAddressLabel, formatAddressLine } from '@/utils/mapAddress'
import type { Address } from '@/types/Address'
import { cn } from '@/utils/cn'

interface AddressCardProps {
  address: Address
  selected: boolean
  onSelect: (addressId: string) => void
  onEdit?: (address: Address) => void
}

export function AddressCard({
  address,
  selected,
  onSelect,
  onEdit,
}: AddressCardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border p-4 transition-colors',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-gray-200 bg-surface hover:border-primary/30',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onSelect(address.id)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          aria-pressed={selected}
        >
          <span
            className={cn(
              'mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
              selected ? 'border-primary' : 'border-gray-300',
            )}
            aria-hidden="true"
          >
            {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-text-primary">
                {formatAddressLabel(address.address_type)}
              </span>
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
                Near: {address.landmark}
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-text-secondary">
              <span>Pincode {address.pincode} · {address.phone}</span>
              {address.distance_km != null && (
                <span className="flex items-center gap-1 text-xs">
                  <Navigation className="h-3 w-3 shrink-0" aria-hidden="true" />
                  ~{address.distance_km.toFixed(1)} km
                </span>
              )}
            </div>
          </div>

          <MapPin
            className={cn(
              'h-5 w-5 shrink-0',
              selected ? 'text-primary' : 'text-text-secondary',
            )}
            aria-hidden="true"
          />
        </button>

        {onEdit ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => onEdit(address)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Button>
        ) : null}
      </div>
    </div>
  )
}
