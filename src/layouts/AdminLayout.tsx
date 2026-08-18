import { Suspense, useMemo, useState } from 'react'
import { Outlet, useLocation, useMatches } from 'react-router-dom'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminTopBar } from '@/components/layout/AdminTopBar'
import { AdminMobileNav } from '@/components/layout/AdminMobileNav'
import { LoadingState } from '@/components/ui/LoadingState'
import { getAdminPageMeta } from '@/data/adminNavigation'
import { useTenantDocumentTitle } from '@/hooks/useTenantDocumentTitle'

export function AdminLayout() {
  const { pathname } = useLocation()
  const matches = useMatches()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  useTenantDocumentTitle('Admin')

  // Prefer the deepest matched route path so layout titles track the active page
  // even if a parent segment is `/admin` (Dashboard).
  const activePath = useMemo(() => {
    const deepest = [...matches]
      .map((match) => match.pathname)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)[0]
    return deepest || pathname
  }, [matches, pathname])

  const { title, description } = getAdminPageMeta(activePath)

  return (
    <div className="flex min-h-svh bg-background">
      <AdminSidebar />
      <AdminMobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar
          key={activePath}
          title={title}
          description={description}
          onMenuToggle={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 p-3 md:p-4 lg:p-5">
          <Suspense fallback={<LoadingState fullPage variant="inline" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
