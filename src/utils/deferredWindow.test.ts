import { describe, expect, it, vi } from 'vitest'
import {
  closeDeferredTab,
  navigateDeferredTab,
  openDeferredTab,
  type DeferredWindowHandle,
} from './deferredWindow'

describe('openDeferredTab', () => {
  it('does not open a tab when disabled', () => {
    const open = vi.fn()
    expect(openDeferredTab(false, open)).toBeNull()
    expect(open).not.toHaveBeenCalled()
  })

  it('reserves a blank tab and marks it loading', () => {
    const handle: DeferredWindowHandle = {
      closed: false,
      document: {},
      location: { href: '' },
    }
    const open = vi.fn(() => handle)

    const result = openDeferredTab(true, open)

    expect(open).toHaveBeenCalledWith('', '_blank')
    expect(result).toBe(handle)
    expect(handle.document?.title).toBe('Loading...')
  })
})

describe('closeDeferredTab', () => {
  it('closes a reserved tab when close is available', () => {
    const close = vi.fn()
    const handle: DeferredWindowHandle = {
      closed: false,
      location: { href: '' },
      close,
    }

    closeDeferredTab(handle)

    expect(close).toHaveBeenCalledTimes(1)
  })
})

describe('navigateDeferredTab', () => {
  it('reuses the reserved tab when it is still open', () => {
    const handle: DeferredWindowHandle = {
      closed: false,
      location: { href: '' },
    }
    const fallback = vi.fn()

    navigateDeferredTab(handle, 'https://example.com/pay', fallback)

    expect(handle.location.href).toBe('https://example.com/pay')
    expect(fallback).not.toHaveBeenCalled()
  })

  it('falls back to opening a new tab when the reserved one is closed', () => {
    const handle: DeferredWindowHandle = {
      closed: true,
      location: { href: '' },
    }
    const fallback = vi.fn()

    navigateDeferredTab(handle, 'https://example.com/pay', fallback)

    expect(fallback).toHaveBeenCalledWith(
      'https://example.com/pay',
      '_blank',
      'noopener,noreferrer',
    )
  })
})
