/**
 * Opens an HTML ticket in a hidden iframe and triggers the system print dialog.
 * For silent dual-printer routing, use the local print agent instead.
 */
export function printHtmlInBrowser(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.opacity = '0'
    iframe.style.pointerEvents = 'none'

    const cleanup = () => {
      iframe.remove()
    }

    iframe.onload = () => {
      try {
        const frameWindow = iframe.contentWindow
        if (!frameWindow) {
          cleanup()
          reject(new Error('Unable to open print frame.'))
          return
        }

        frameWindow.focus()
        frameWindow.print()
        window.setTimeout(() => {
          cleanup()
          resolve()
        }, 500)
      } catch (error) {
        cleanup()
        reject(error instanceof Error ? error : new Error('Print failed.'))
      }
    }

    document.body.appendChild(iframe)
    const doc = iframe.contentDocument
    if (!doc) {
      cleanup()
      reject(new Error('Unable to write print document.'))
      return
    }

    doc.open()
    doc.write(html)
    doc.close()
  })
}
