import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import { redirectToCanonicalHost } from '@/utils/canonicalHost'
import '@/index.css'

if (!redirectToCanonicalHost()) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
