import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import * as modifierService from '@/services/modifierService'
import type { DishModifierGroup } from '@/types/Modifier'
import { formatPrice } from '@/utils/format'

interface DishModifiersEditorProps {
  dishId: string
}

export function DishModifiersEditor({ dishId }: DishModifiersEditorProps) {
  const [groups, setGroups] = useState<DishModifierGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [groupName, setGroupName] = useState('')
  const [minSelection, setMinSelection] = useState(0)
  const [maxSelection, setMaxSelection] = useState('')
  const [optionDrafts, setOptionDrafts] = useState<
    Record<string, { name: string; priceDelta: string }>
  >({})
  const [isSaving, setIsSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    const result = await modifierService.getDishModifierGroups(dishId, {
      includeUnavailable: true,
    })
    setIsLoading(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setGroups(result.data)
  }

  useEffect(() => {
    void load()
  }, [dishId])

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required')
      return
    }

    setIsSaving(true)
    const result = await modifierService.createModifierGroupForDish(dishId, {
      name: groupName,
      minSelection,
      maxSelection: maxSelection === '' ? null : Number(maxSelection),
    })
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Modifier group added')
    setGroupName('')
    setMinSelection(0)
    setMaxSelection('')
    await load()
  }

  const handleAddOption = async (groupId: string) => {
    const draft = optionDrafts[groupId] ?? { name: '', priceDelta: '0' }

    if (!draft.name.trim()) {
      toast.error('Option name is required')
      return
    }

    setIsSaving(true)
    const result = await modifierService.createModifier(groupId, {
      name: draft.name,
      priceDelta: Number(draft.priceDelta) || 0,
    })
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setOptionDrafts((current) => ({
      ...current,
      [groupId]: { name: '', priceDelta: '0' },
    }))
    toast.success('Option added')
    await load()
  }

  const handleDeactivateGroup = async (groupId: string) => {
    setIsSaving(true)
    const result = await modifierService.deactivateModifierGroup(groupId)
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Group deactivated')
    await load()
  }

  const handleDeactivateModifier = async (modifierId: string) => {
    setIsSaving(true)
    const result = await modifierService.deactivateModifier(modifierId)
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Option deactivated')
    await load()
  }

  if (isLoading) {
    return (
      <p className="text-sm text-text-secondary">Loading modifiers...</p>
    )
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-input)] border border-gray-200 p-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">Modifiers</h3>
        <p className="mt-1 text-xs text-text-secondary">
          Add-ons and choices (spice level, egg, raita). Soft-deactivate instead
          of deleting so past orders stay intact.
        </p>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-text-secondary">No modifier groups yet.</p>
      )}

      {groups.map((group) => (
        <div
          key={group.id}
          className="space-y-3 rounded-[var(--radius-input)] bg-background p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-text-primary">
                {group.name}
                {!group.is_active && (
                  <span className="ml-2 text-xs text-text-secondary">
                    (inactive)
                  </span>
                )}
              </p>
              <p className="text-xs text-text-secondary">
                Select {group.min_selection}
                {group.max_selection != null
                  ? `–${group.max_selection}`
                  : '+'}
              </p>
            </div>
            {group.is_active && (
              <button
                type="button"
                onClick={() => void handleDeactivateGroup(group.id)}
                disabled={isSaving}
                className="text-text-secondary hover:text-error"
                aria-label={`Deactivate ${group.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <ul className="space-y-1">
            {group.modifiers.map((modifier) => (
              <li
                key={modifier.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span
                  className={
                    modifier.is_available
                      ? 'text-text-primary'
                      : 'text-text-secondary line-through'
                  }
                >
                  {modifier.name}
                  {modifier.price_delta !== 0 && (
                    <span className="ml-2 text-text-secondary">
                      {modifier.price_delta > 0 ? '+' : ''}
                      {formatPrice(modifier.price_delta)}
                    </span>
                  )}
                </span>
                {modifier.is_available && (
                  <button
                    type="button"
                    onClick={() => void handleDeactivateModifier(modifier.id)}
                    disabled={isSaving}
                    className="text-text-secondary hover:text-error"
                    aria-label={`Deactivate ${modifier.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {group.is_active && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Input
                label="Option"
                value={optionDrafts[group.id]?.name ?? ''}
                onChange={(event) =>
                  setOptionDrafts((current) => ({
                    ...current,
                    [group.id]: {
                      name: event.target.value,
                      priceDelta: current[group.id]?.priceDelta ?? '0',
                    },
                  }))
                }
                placeholder="e.g. Extra egg"
              />
              <Input
                label="Price Δ"
                type="number"
                step="0.01"
                value={optionDrafts[group.id]?.priceDelta ?? '0'}
                onChange={(event) =>
                  setOptionDrafts((current) => ({
                    ...current,
                    [group.id]: {
                      name: current[group.id]?.name ?? '',
                      priceDelta: event.target.value,
                    },
                  }))
                }
              />
              <Button
                type="button"
                variant="secondary"
                disabled={isSaving}
                onClick={() => void handleAddOption(group.id)}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          )}
        </div>
      ))}

      <div className="space-y-3 border-t border-gray-200 pt-4">
        <p className="text-sm font-medium text-text-primary">New group</p>
        <Input
          label="Group name"
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
          placeholder="e.g. Spice Level"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Min selections"
            type="number"
            min={0}
            value={minSelection}
            onChange={(event) => setMinSelection(Number(event.target.value) || 0)}
          />
          <Input
            label="Max selections (blank = unlimited)"
            type="number"
            min={1}
            value={maxSelection}
            onChange={(event) => setMaxSelection(event.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={isSaving}
          onClick={() => void handleCreateGroup()}
        >
          <Plus className="h-4 w-4" />
          Add group
        </Button>
      </div>
    </div>
  )
}
