import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/utils/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  className?: string
  /** Optional sticky footer (e.g. action buttons) always visible on mobile */
  footer?: ReactNode
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  footer,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(panelRef, isOpen)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    const scrollbarGap =
      window.innerWidth - document.documentElement.clientWidth

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-[var(--radius-card)] bg-surface shadow-lg sm:rounded-[var(--radius-card)]',
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/5 px-3 py-3 sm:px-4">
          {title && (
            <h2 id="modal-title" className="text-lg font-semibold leading-tight">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-black/5 bg-surface px-3 py-3 sm:px-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
