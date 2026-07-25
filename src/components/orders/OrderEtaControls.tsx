import { ETA_BUMP_MINUTES } from '@/constants/ORDER'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { isTerminalOrderStatus } from '@/utils/orderEta'
import type { OrderStatus } from '@/types/enums'

interface OrderEtaControlsProps {
  orderStatus: OrderStatus
  isUpdating?: boolean
  onBump: (minutes: number) => void
  onSetMinutesFromNow: (minutes: number) => void
  /** Compact layout for kitchen cards */
  compact?: boolean
}

export function OrderEtaControls({
  orderStatus,
  isUpdating = false,
  onBump,
  onSetMinutesFromNow,
  compact = false,
}: OrderEtaControlsProps) {
  if (isTerminalOrderStatus(orderStatus)) return null

  const handleSet = () => {
    const raw = window.prompt(
      'Set delivery time (minutes from now):',
      '45',
    )
    if (raw === null) return
    const minutes = Number.parseInt(raw.trim(), 10)
    if (!Number.isFinite(minutes)) return
    onSetMinutesFromNow(minutes)
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {ETA_BUMP_MINUTES.map((minutes) => (
          <button
            key={minutes}
            type="button"
            disabled={isUpdating}
            onClick={() => onBump(minutes)}
            className="rounded-md border border-black/10 bg-background px-2 py-1 text-xs font-semibold text-text-primary transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            +{minutes}
          </button>
        ))}
        <button
          type="button"
          disabled={isUpdating}
          onClick={handleSet}
          className="rounded-md border border-black/10 bg-background px-2 py-1 text-xs font-semibold text-text-secondary transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          Set…
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text-primary">Adjust delivery time</p>
      <div className="flex flex-wrap gap-2">
        {ETA_BUMP_MINUTES.map((minutes) => (
          <Button
            key={minutes}
            type="button"
            variant="secondary"
            size="sm"
            disabled={isUpdating}
            onClick={() => onBump(minutes)}
          >
            +{minutes} min
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isUpdating}
          onClick={handleSet}
        >
          Set custom…
        </Button>
      </div>
      <SetMinutesForm
        disabled={isUpdating}
        onSubmit={onSetMinutesFromNow}
      />
    </div>
  )
}

function SetMinutesForm({
  disabled,
  onSubmit,
}: {
  disabled?: boolean
  onSubmit: (minutes: number) => void
}) {
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const input = form.elements.namedItem('etaMinutes') as HTMLInputElement
        const minutes = Number.parseInt(input.value, 10)
        if (!Number.isFinite(minutes)) return
        onSubmit(minutes)
      }}
    >
      <Input
        name="etaMinutes"
        label="Minutes from now"
        type="number"
        min={5}
        max={240}
        defaultValue={45}
        disabled={disabled}
        className="h-10"
      />
      <Button type="submit" size="sm" disabled={disabled} className="shrink-0">
        Apply
      </Button>
    </form>
  )
}
