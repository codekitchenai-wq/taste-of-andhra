import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatAddressLine } from '@/utils/mapAddress'
import type { Address } from '@/types/Address'
import { cn } from '@/utils/cn'

interface AddressCardProps {
  address: Address
  selected: boolean
  onSelect: (addressId: string) => void
}

export function AddressCard({ address, selected, onSelect }: AddressCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(address.id)}
      className={cn(
        'w-full rounded-[var(--radius-card)] border p-4 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-gray-200 bg-surface hover:border-primary/30',
      )}
    >
      <div className="flex items-start gap-3">
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
              {address.full_name}
            </span>
            <Badge variant="default">{address.address_type}</Badge>
            {address.is_default && <Badge variant="featured">Default</Badge>}
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            {formatAddressLine(address)}
          </p>
          {address.landmark && (
            <p className="mt-1 text-sm text-text-secondary">
              Near: {address.landmark}
            </p>
          )}
          <p className="mt-1 text-sm text-text-secondary">
            Pincode {address.pincode} · {address.phone}
          </p>
        </div>

        <MapPin
          className={cn(
            'h-5 w-5 shrink-0',
            selected ? 'text-primary' : 'text-text-secondary',
          )}
          aria-hidden="true"
        />
      </div>
    </button>
  )
}
