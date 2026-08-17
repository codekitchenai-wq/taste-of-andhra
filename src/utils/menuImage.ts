const SWIGGY_UPLOAD = '/image/upload/'

/** Local Taste of Andhra photos that must not appear on other tenants. */
export function isAndhraLocalAsset(url: string | null | undefined): boolean {
  if (!url) return false
  const path = url.split('?')[0]?.toLowerCase() ?? ''
  if (path.includes('/images/tenants/')) return false
  return (
    path.includes('/images/hero/') ||
    path.includes('/images/categories/') ||
    path.includes('/images/dishes/')
  )
}

function replaceWidthTransform(transforms: string, width: number): string {
  const parts = transforms
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^w_\d+$/i.test(part) && !/^h_\d+$/i.test(part))

  if (!parts.includes('f_auto')) parts.unshift('f_auto')
  if (!parts.includes('q_auto')) parts.unshift('q_auto')
  if (!parts.some((part) => part.startsWith('fl_'))) parts.unshift('fl_lossy')
  parts.push(`w_${width}`)
  return parts.join(',')
}

/**
 * Request a smaller Cloudinary/Swiggy derivative so menu grids do not
 * download full food-catalog JPGs.
 */
export function optimizeMenuImage(
  url: string | null | undefined,
  width = 400,
): string | null {
  const src = url?.trim()
  if (!src) return null
  if (src.startsWith('/') || src.startsWith('data:')) return src

  try {
    const parsed = new URL(src)
    const markerAt = parsed.pathname.indexOf(SWIGGY_UPLOAD)
    if (markerAt === -1) return src

    const after = parsed.pathname.slice(markerAt + SWIGGY_UPLOAD.length)
    const slash = after.indexOf('/')
    const first = slash === -1 ? after : after.slice(0, slash)
    const rest = slash === -1 ? '' : after.slice(slash)
    const isVersion = /^v\d+$/i.test(first)
    const isTransform =
      first.includes(',') ||
      /^w_\d+$/i.test(first) ||
      first.startsWith('fl_') ||
      first.startsWith('f_') ||
      first.startsWith('q_')

    const transforms = isTransform
      ? replaceWidthTransform(first, width)
      : `fl_lossy,f_auto,q_auto,w_${width}`
    const remainder = isTransform ? rest : isVersion ? `/${after}` : `/${after}`

    parsed.pathname = `${parsed.pathname.slice(0, markerAt)}${SWIGGY_UPLOAD}${transforms}${remainder}`
    return parsed.toString()
  } catch {
    return src
  }
}

export function tenantSafeImage(
  url: string | null | undefined,
  orgSlug: string | null,
  fallback: string,
): string {
  if (url && !isAndhraLocalAsset(url)) {
    return optimizeMenuImage(url, 480) ?? fallback
  }
  if (orgSlug && orgSlug !== 'thetasteofandhra') return fallback
  return url || fallback
}
