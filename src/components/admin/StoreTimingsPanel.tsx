import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import * as settingsService from '@/services/settingsService'
import type {
  DateOverride,
  DaySchedule,
  StoreOperatingHours,
  Weekday,
} from '@/types/StoreHours'
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  createDefaultStoreHours,
  formatDayWindow,
  getStoreOpenStatus,
  getZonedParts,
  toDateKey,
} from '@/utils/storeHours'

function emptyOverride(date = ''): DateOverride {
  return {
    date,
    isOpen: true,
    open: '11:00',
    close: '23:00',
    note: '',
  }
}

export function StoreTimingsPanel() {
  const [hours, setHours] = useState<StoreOperatingHours>(
    createDefaultStoreHours(),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    void settingsService.getStoreOperatingHours().then((result) => {
      if (cancelled) return
      if (result.success) {
        setHours(result.data)
      }
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const liveStatus = useMemo(() => getStoreOpenStatus(hours), [hours])

  const todayKey = useMemo(() => {
    const parts = getZonedParts(new Date(), hours.timezone)
    return toDateKey(parts.year, parts.month, parts.day)
  }, [hours.timezone])

  const updateDay = (day: Weekday, patch: Partial<DaySchedule>) => {
    setHours((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], ...patch },
      },
    }))
  }

  const updateOverride = (index: number, patch: Partial<DateOverride>) => {
    setHours((prev) => ({
      ...prev,
      overrides: prev.overrides.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    }))
  }

  const addOverride = () => {
    setHours((prev) => ({
      ...prev,
      overrides: [...prev.overrides, emptyOverride(todayKey)],
    }))
  }

  const removeOverride = (index: number) => {
    setHours((prev) => ({
      ...prev,
      overrides: prev.overrides.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const result = await settingsService.setStoreOperatingHours(hours)
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setHours(result.data)
    toast.success('Store timings saved')
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Store timings
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Set weekly hours, close a full day, or extend hours for a specific
            date. Online orders outside these windows are blocked.
          </p>
        </div>
        <div
          className={`rounded-[var(--radius-button)] px-3 py-2 text-sm font-medium ${
            liveStatus.isOpen
              ? 'bg-success/10 text-success'
              : 'bg-error/10 text-error'
          }`}
        >
          {liveStatus.isOpen ? 'Accepting orders now' : 'Not accepting orders'}
        </div>
      </div>

      <p className="mt-2 text-xs text-text-secondary">{liveStatus.reason}</p>

      {isLoading ? (
        <p className="mt-6 text-sm text-text-secondary">Loading timings…</p>
      ) : (
        <div className="mt-6 space-y-8">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-text-secondary">
                  <th className="py-2 pr-3 font-medium">Day</th>
                  <th className="py-2 pr-3 font-medium">Open</th>
                  <th className="py-2 pr-3 font-medium">From</th>
                  <th className="py-2 pr-3 font-medium">To</th>
                  <th className="py-2 font-medium">Preview</th>
                </tr>
              </thead>
              <tbody>
                {WEEKDAYS.map((day) => {
                  const entry = hours.schedule[day]
                  return (
                    <tr key={day} className="border-b border-black/5">
                      <td className="py-2.5 pr-3 font-medium text-text-primary">
                        {WEEKDAY_LABELS[day]}
                      </td>
                      <td className="py-2.5 pr-3">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={entry.isOpen}
                            onChange={(event) =>
                              updateDay(day, { isOpen: event.target.checked })
                            }
                          />
                          <span className="text-text-secondary">
                            {entry.isOpen ? 'Open' : 'Closed'}
                          </span>
                        </label>
                      </td>
                      <td className="py-2.5 pr-3">
                        <input
                          type="time"
                          className="rounded-[var(--radius-button)] border border-black/10 bg-background px-2 py-1.5 disabled:opacity-50"
                          value={entry.open}
                          disabled={!entry.isOpen}
                          onChange={(event) =>
                            updateDay(day, { open: event.target.value })
                          }
                        />
                      </td>
                      <td className="py-2.5 pr-3">
                        <input
                          type="time"
                          className="rounded-[var(--radius-button)] border border-black/10 bg-background px-2 py-1.5 disabled:opacity-50"
                          value={entry.close}
                          disabled={!entry.isOpen}
                          onChange={(event) =>
                            updateDay(day, { close: event.target.value })
                          }
                        />
                      </td>
                      <td className="py-2.5 text-text-secondary">
                        {formatDayWindow(entry)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-text-primary">
                  Special dates
                </h4>
                <p className="mt-1 text-sm text-text-secondary">
                  Close for a holiday, or extend (or shorten) hours for one day
                  without changing the weekly schedule.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addOverride}
              >
                <Plus className="h-3.5 w-3.5" />
                Add date
              </Button>
            </div>

            {hours.overrides.length === 0 ? (
              <p className="mt-3 text-sm text-text-secondary">
                No special dates yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {hours.overrides.map((override, index) => (
                  <li
                    key={`${override.date}-${index}`}
                    className="rounded-[var(--radius-button)] border border-black/5 bg-background p-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-[140px_auto_1fr_auto]">
                      <Input
                        label="Date"
                        type="date"
                        value={override.date}
                        onChange={(event) =>
                          updateOverride(index, { date: event.target.value })
                        }
                      />
                      <label className="flex items-end gap-2 pb-2 text-sm">
                        <input
                          type="checkbox"
                          checked={override.isOpen}
                          onChange={(event) =>
                            updateOverride(index, {
                              isOpen: event.target.checked,
                            })
                          }
                        />
                        <span>
                          {override.isOpen ? 'Custom hours' : 'Closed all day'}
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="mb-1 block text-xs text-text-secondary">
                            From
                          </span>
                          <input
                            type="time"
                            className="w-full rounded-[var(--radius-button)] border border-black/10 bg-surface px-2 py-2 disabled:opacity-50"
                            value={override.open ?? '11:00'}
                            disabled={!override.isOpen}
                            onChange={(event) =>
                              updateOverride(index, {
                                open: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <span className="mb-1 block text-xs text-text-secondary">
                            To
                          </span>
                          <input
                            type="time"
                            className="w-full rounded-[var(--radius-button)] border border-black/10 bg-surface px-2 py-2 disabled:opacity-50"
                            value={override.close ?? '23:00'}
                            disabled={!override.isOpen}
                            onChange={(event) =>
                              updateOverride(index, {
                                close: event.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="self-end"
                        onClick={() => removeOverride(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                    <div className="mt-3">
                      <Input
                        label="Note (optional)"
                        value={override.note ?? ''}
                        placeholder="e.g. Diwali holiday / Festival extended hours"
                        onChange={(event) =>
                          updateOverride(index, { note: event.target.value })
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
            >
              {isSaving ? 'Saving…' : 'Save store timings'}
            </Button>
            <p className="text-xs text-text-secondary">
              Times use {hours.timezone}.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
