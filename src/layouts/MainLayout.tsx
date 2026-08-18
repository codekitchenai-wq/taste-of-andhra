import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppFab } from '@/components/layout/WhatsAppFab'
import { LoadingState } from '@/components/ui/LoadingState'
import { useTenantDocumentTitle } from '@/hooks/useTenantDocumentTitle'

export function MainLayout() {
  useTenantDocumentTitle()

  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1 pt-[72px]">
        <Suspense fallback={<LoadingState fullPage className="py-12" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <WhatsAppFab />
    </div>
  )
}
