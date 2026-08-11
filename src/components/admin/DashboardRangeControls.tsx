import { DASHBOARD_RANGE_PRESETS } from '@/utils/dateRange'
import type { DashboardDateRange, DashboardRangePreset } from '@/utils/dateRange'
import { cn } from '@/utils/cn'

interface DashboardRangeControlsProps {
  range: DashboardDateRange
  customFrom: string
  customTo: string
  onPreset: (preset: Exclude<DashboardRangePreset, 'custom'>) => void
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
  onApplyCustom: () => void
}

export function DashboardRangeControls({
  range,
  customFrom,
  customTo,
  onPreset,
  onCustomFromChange,
  onCustomToChange,
  onApplyCustom,
}: DashboardRangeControlsProps) {
  return (
    <section className="rounded-[var(--radius-card)] bg-surface p-3 shadow-md sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {DASHBOARD_RANGE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPreset(preset.id)}
              className={cn(
                'rounded-[var(--radius-button)] px-3 py-1.5 text-sm font-medium transition-colors',
                range.preset === preset.id
                  ? 'bg-primary text-white'
                  : 'bg-background text-text-secondary hover:bg-primary/10 hover:text-primary',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-text-secondary">
            From
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(event) => onCustomFromChange(event.target.value)}
              className="mt-1 block h-9 rounded-[var(--radius-input)] border border-gray-300 bg-background px-2 text-sm text-text-primary"
            />
          </label>
          <label className="text-xs text-text-secondary">
            To
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(event) => onCustomToChange(event.target.value)}
              className="mt-1 block h-9 rounded-[var(--radius-input)] border border-gray-300 bg-background px-2 text-sm text-text-primary"
            />
          </label>
          <button
            type="button"
            onClick={onApplyCustom}
            className={cn(
              'h-9 rounded-[var(--radius-button)] px-3 text-sm font-medium transition-colors',
              range.preset === 'custom'
                ? 'bg-primary text-white'
                : 'border border-black/10 bg-background text-text-primary hover:border-primary hover:text-primary',
            )}
          >
            Apply range
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-text-secondary">
        Showing <span className="font-medium text-text-primary">{range.label}</span>
        {range.preset === 'custom' ? '' : ` · ${range.fromDate === range.toDate ? range.fromDate : `${range.fromDate} → ${range.toDate}`}`}
      </p>
    </section>
  )
}
