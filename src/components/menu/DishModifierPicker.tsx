import type { DishModifierGroup } from '@/types/Modifier'
import { formatPrice } from '@/utils/format'
import { cn } from '@/utils/cn'

interface DishModifierPickerProps {
  groups: DishModifierGroup[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
}

export function DishModifierPicker({
  groups,
  selectedIds,
  onChange,
}: DishModifierPickerProps) {
  const selected = new Set(selectedIds)

  const toggle = (group: DishModifierGroup, modifierId: string) => {
    const next = new Set(selected)
    const isSingle = group.max_selection === 1

    if (next.has(modifierId)) {
      next.delete(modifierId)
    } else if (isSingle) {
      for (const option of group.modifiers) {
        next.delete(option.id)
      }
      next.add(modifierId)
    } else {
      const chosenInGroup = group.modifiers.filter((m) => next.has(m.id)).length
      if (
        group.max_selection !== null &&
        chosenInGroup >= group.max_selection
      ) {
        return
      }
      next.add(modifierId)
    }

    onChange([...next])
  }

  if (groups.length === 0) return null

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <fieldset key={group.id} className="space-y-2">
          <legend className="text-sm font-semibold text-text-primary">
            {group.name}
            {group.min_selection > 0 && (
              <span className="ml-1 font-normal text-text-secondary">
                (required
                {group.max_selection === 1 ? '' : `, pick ${group.min_selection}+`}
                )
              </span>
            )}
          </legend>
          <div className="space-y-2">
            {group.modifiers.map((modifier) => {
              const checked = selected.has(modifier.id)
              const inputType = group.max_selection === 1 ? 'radio' : 'checkbox'

              return (
                <label
                  key={modifier.id}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-input)] border px-3 py-2 text-sm transition-colors',
                    checked
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/40',
                  )}
                >
                  <span className="flex items-center gap-2 text-text-primary">
                    <input
                      type={inputType}
                      name={`modifier-group-${group.id}`}
                      checked={checked}
                      onChange={() => toggle(group, modifier.id)}
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                    />
                    {modifier.name}
                  </span>
                  <span className="shrink-0 text-text-secondary">
                    {modifier.price_delta === 0
                      ? 'Included'
                      : `${modifier.price_delta > 0 ? '+' : ''}${formatPrice(modifier.price_delta)}`}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
