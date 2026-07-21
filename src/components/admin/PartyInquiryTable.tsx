import type { PartyInquiry } from '@/types/PartyInquiry'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/utils/format'

interface PartyInquiryTableProps {
  inquiries: PartyInquiry[]
  onStatusChange: (id: string, status: PartyInquiry['status']) => void
}

const STATUS_LABELS: Record<PartyInquiry['status'], string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  closed: 'Closed',
}

const MEAL_LABELS: Record<PartyInquiry['meal_preference'], string> = {
  veg: 'Vegetarian',
  non_veg: 'Non-Veg',
  mix: 'Mix',
}

export function PartyInquiryTable({
  inquiries,
  onStatusChange,
}: PartyInquiryTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="border-b border-black/5 bg-background/60">
          <tr>
            <th className="px-4 py-3 font-semibold text-text-primary">Contact</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Event</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Guests</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Meal</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Location</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Status</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((inquiry) => (
            <tr
              key={inquiry.id}
              className="border-b border-black/5 align-top last:border-b-0"
            >
              <td className="px-4 py-4">
                <p className="font-medium text-text-primary">
                  {inquiry.full_name}
                </p>
                <p className="text-xs text-text-secondary">{inquiry.email}</p>
                <p className="text-xs text-text-secondary">{inquiry.phone}</p>
              </td>
              <td className="px-4 py-4 text-text-secondary">
                {inquiry.event_date
                  ? formatDate(inquiry.event_date)
                  : 'Not specified'}
              </td>
              <td className="px-4 py-4 text-text-primary">
                {inquiry.guest_count}
              </td>
              <td className="px-4 py-4">
                <Badge variant="default">
                  {MEAL_LABELS[inquiry.meal_preference]}
                </Badge>
              </td>
              <td className="px-4 py-4 text-text-secondary">
                <p>{inquiry.address_line1}</p>
                <p className="text-xs">
                  {inquiry.landmark}, {inquiry.city}, {inquiry.state}{' '}
                  {inquiry.pincode}
                </p>
                {inquiry.notes && (
                  <p className="mt-2 text-xs italic">{inquiry.notes}</p>
                )}
              </td>
              <td className="px-4 py-4">
                <select
                  value={inquiry.status}
                  onChange={(event) =>
                    onStatusChange(
                      inquiry.id,
                      event.target.value as PartyInquiry['status'],
                    )
                  }
                  className="h-10 rounded-[var(--radius-input)] border border-gray-300 bg-surface px-3 text-sm"
                  aria-label={`Update status for ${inquiry.full_name}`}
                >
                  {(Object.keys(STATUS_LABELS) as PartyInquiry['status'][]).map(
                    (status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ),
                  )}
                </select>
              </td>
              <td className="px-4 py-4 text-text-secondary">
                {formatDate(inquiry.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
