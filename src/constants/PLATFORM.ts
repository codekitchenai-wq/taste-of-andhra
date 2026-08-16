/** Apex host used to build `{slug}.domain` storefronts. */
export const PLATFORM_ROOT_DOMAIN = (
  import.meta.env.VITE_PLATFORM_ROOT_DOMAIN?.trim() || 'directapp.in'
).replace(/^www\./i, '')

export const PLATFORM_WWW_URL = `https://www.${PLATFORM_ROOT_DOMAIN}`
