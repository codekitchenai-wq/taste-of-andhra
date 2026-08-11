import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'

interface MenuSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function MenuSearchBar({ value, onChange }: MenuSearchBarProps) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
        aria-hidden="true"
      />
      <Input
        type="search"
        placeholder="Search dishes..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 pl-9 pr-10 text-sm"
        aria-label="Search dishes"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
