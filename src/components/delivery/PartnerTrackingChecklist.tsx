import { CheckCircle2, Circle } from 'lucide-react'

interface PartnerTrackingChecklistProps {
  isSharing: boolean
  isScreenAwake: boolean
  lastSentAt: Date | null
  locationError: string | null
}

function Row({
  done,
  label,
}: {
  done: boolean
  label: string
}) {
  const Icon = done ? CheckCircle2 : Circle

  return (
    <li className="flex items-start gap-2 text-sm text-text-secondary">
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${
          done ? 'text-success' : 'text-gray-400'
        }`}
        aria-hidden="true"
      />
      <span className={done ? 'text-text-primary' : undefined}>{label}</span>
    </li>
  )
}

export function PartnerTrackingChecklist({
  isSharing,
  isScreenAwake,
  lastSentAt,
  locationError,
}: PartnerTrackingChecklistProps) {
  const permissionOk = !locationError?.toLowerCase().includes('permission')
  const hasFix = lastSentAt != null

  return (
    <div className="mt-4 rounded-[var(--radius-button)] bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Keep tracking on
      </p>
      <ul className="mt-2 space-y-1.5">
        <Row
          done={permissionOk && !locationError}
          label="Allow location for this website (While using the app)"
        />
        <Row
          done={isSharing && hasFix}
          label={
            hasFix
              ? 'GPS is sharing with the customer'
              : 'Open this order and tap Share Live Location'
          }
        />
        <Row
          done={isSharing && isScreenAwake}
          label="Keep this screen open — tracking pauses if you lock the phone or switch apps"
        />
      </ul>
    </div>
  )
}
