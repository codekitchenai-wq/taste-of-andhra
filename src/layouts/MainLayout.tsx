import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppFab } from '@/components/layout/WhatsAppFab'
import { LoadingState } from '@/components/ui/LoadingState'
import { ROUTES } from '@/constants/ROUTES'

export function MainLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === ROUTES.HOME

  return (
    <div className="flex min-h-svh flex-col">
      <Navbar transparent={isHome} />
      <main className="flex-1">
        <Suspense fallback={<LoadingState fullPage className="py-12" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <WhatsAppFab />
    </div>
  )
}
