import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ConfigBanner } from '@/components/ui/ConfigBanner'
import { AuthProvider } from '@/contexts/AuthContext'
import { BranchProvider } from '@/contexts/BranchContext'
import { CartProvider } from '@/contexts/CartContext'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import { router } from '@/routes'

export default function App() {
  return (
    <AuthProvider>
      <BranchProvider>
        <CartProvider>
          <FavoritesProvider>
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
    </AuthProvider>
  )
}
