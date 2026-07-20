import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { LoadingState } from '@/components/ui/LoadingState'
import App from '@/App'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<LoadingState fullPage variant="inline" />}>
      <App />
    </Suspense>
  </StrictMode>,
)
