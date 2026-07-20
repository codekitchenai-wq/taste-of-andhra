import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminTopBar } from '@/components/layout/AdminTopBar'
import { AdminMobileNav } from '@/components/layout/AdminMobileNav'
import { LoadingState } from '@/components/ui/LoadingState'
import { adminNavItems } from '@/data/adminNavigation'

function getAdminPageTitle(pathname: string): string {
  const match = adminNavItems.find((item) => item.to === pathname)
  return match?.label ?? 'Admin'
}

export function AdminLayout() {
  const { pathname } = useLocation()
  const title = getAdminPageTitle(pathname)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-background">
      <AdminSidebar />
      <AdminMobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar
          title={title}
          onMenuToggle={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Suspense fallback={<LoadingState fullPage variant="inline" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
