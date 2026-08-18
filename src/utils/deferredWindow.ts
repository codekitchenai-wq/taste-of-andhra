export interface DeferredWindowHandle {
  closed?: boolean
  document?: {
    title?: string
  }
  location: {
    href: string
  }
  close?: () => void
}

export type DeferredWindowOpener = (
  url?: string,
  target?: string,
  features?: string,
) => DeferredWindowHandle | null

export function openDeferredTab(
  enabled: boolean,
  openFn: DeferredWindowOpener = window.open,
): DeferredWindowHandle | null {
  if (!enabled) return null
  const handle = openFn('', '_blank')
  if (handle?.document) {
    handle.document.title = 'Loading...'
  }
  return handle
}

export function navigateDeferredTab(
  handle: DeferredWindowHandle | null | undefined,
  url: string,
  fallbackOpen: DeferredWindowOpener = window.open,
): void {
  if (handle && !handle.closed) {
    handle.location.href = url
    return
  }
  fallbackOpen(url, '_blank', 'noopener,noreferrer')
}

export function closeDeferredTab(
  handle: DeferredWindowHandle | null | undefined,
): void {
  handle?.close?.()
}
