import { useMemo } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { CustomerEnrollmentSync } from '@/components/auth/CustomerEnrollmentSync'
import { TenantSessionGuard } from '@/components/auth/TenantSessionGuard'
import { ConfigBanner } from '@/components/ui/ConfigBanner'
import { AuthProvider } from '@/contexts/AuthContext'
import { BranchProvider } from '@/contexts/BranchContext'
import { CartProvider } from '@/contexts/CartContext'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { createAppRouter } from '@/routes'
import { isPlatformMarketingHost } from '@/utils/platformHost'

export default function App() {
  const marketing = isPlatformMarketingHost()
  const router = useMemo(() => createAppRouter(), [marketing])

  return (
    <AuthProvider>
      <OrganizationProvider>
        <BranchProvider>
          <CartProvider>
            <FavoritesProvider>
              <CustomerEnrollmentSync />
              <TenantSessionGuard />
              <ConfigBanner />
              <RouterProvider router={router} />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    borderRadius: '12px',
                    background: '#FFFFFF',
                    color: '#212121',
                  },
                }}
              />
            </FavoritesProvider>
          </CartProvider>
        </BranchProvider>
      </OrganizationProvider>
    </AuthProvider>
  )
}
