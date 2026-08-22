import { redirectToCanonicalHost } from '@/utils/canonicalHost'
import {
  recoverOAuthTenantHostIfNeeded,
  redirectDisabledTasteOfAndhraHost,
  redirectOAuthReturnFromTasteOfAndhraHost,
} from '@/utils/oauthHandoff'
import '@/index.css'

async function boot() {
  if (redirectToCanonicalHost()) return
  // Must run even when the Taste of Andhra custom domain is enabled: Google's
  // Site URL return lands on .com where the `.directapp.in` tenant cookie is invisible.
  if (redirectOAuthReturnFromTasteOfAndhraHost()) return
  if (redirectDisabledTasteOfAndhraHost()) return
  if (recoverOAuthTenantHostIfNeeded()) return

  const [{ StrictMode }, { createRoot }, { default: App }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('@/App'),
  ])

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
