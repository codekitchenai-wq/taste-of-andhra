import { redirectToCanonicalHost } from '@/utils/canonicalHost'
import { recoverOAuthTenantHostIfNeeded } from '@/utils/oauthHandoff'
import '@/index.css'

async function boot() {
  if (redirectToCanonicalHost()) return
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
