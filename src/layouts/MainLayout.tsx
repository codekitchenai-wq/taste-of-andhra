import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ROUTES } from '@/constants/ROUTES'

export function MainLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === ROUTES.HOME

  return (
    <div className="flex min-h-svh flex-col">
      <Navbar transparent={isHome} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
