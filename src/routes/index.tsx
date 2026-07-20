import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/ROUTES'
import { MainLayout } from '@/layouts/MainLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { ProtectedRoute } from '@/components/routing/ProtectedRoute'
import { AdminRoute } from '@/components/routing/AdminRoute'
import { GuestRoute } from '@/components/routing/GuestRoute'

const HomePage = lazy(() => import('@/pages/public/HomePage'))
const AboutPage = lazy(() => import('@/pages/public/AboutPage'))
const MenuPage = lazy(() => import('@/pages/public/MenuPage'))
const DishDetailsPage = lazy(() => import('@/pages/public/DishDetailsPage'))
const GalleryPage = lazy(() => import('@/pages/public/GalleryPage'))
const ContactPage = lazy(() => import('@/pages/public/ContactPage'))

const LoginPage = lazy(() => import('@/pages/customer/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/customer/RegisterPage'))
const ProfilePage = lazy(() => import('@/pages/customer/ProfilePage'))
const MyOrdersPage = lazy(() => import('@/pages/customer/MyOrdersPage'))
const CartPage = lazy(() => import('@/pages/customer/CartPage'))
const CheckoutPage = lazy(() => import('@/pages/customer/CheckoutPage'))
const OrderDetailsPage = lazy(() => import('@/pages/customer/OrderDetailsPage'))
const OrderSuccessPage = lazy(() => import('@/pages/customer/OrderSuccessPage'))
const SavedAddressesPage = lazy(
  () => import('@/pages/customer/SavedAddressesPage'),
)

const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'))
const AdminDashboardPage = lazy(
  () => import('@/pages/admin/AdminDashboardPage'),
)
const AdminCategoriesPage = lazy(
  () => import('@/pages/admin/AdminCategoriesPage'),
)
const AdminDishesPage = lazy(() => import('@/pages/admin/AdminDishesPage'))
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'))
const AdminCustomersPage = lazy(
  () => import('@/pages/admin/AdminCustomersPage'),
)
const AdminDeliveryPage = lazy(
  () => import('@/pages/admin/AdminDeliveryPage'),
)
const AdminOffersPage = lazy(() => import('@/pages/admin/AdminOffersPage'))
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage'))
const AdminSettingsPage = lazy(
  () => import('@/pages/admin/AdminSettingsPage'),
)

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: ROUTES.ABOUT, element: <AboutPage /> },
      { path: ROUTES.MENU, element: <MenuPage /> },
      { path: `${ROUTES.MENU}/:slug`, element: <DishDetailsPage /> },
      { path: ROUTES.GALLERY, element: <GalleryPage /> },
      { path: ROUTES.CONTACT, element: <ContactPage /> },
      { path: ROUTES.CART, element: <CartPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: ROUTES.PROFILE, element: <ProfilePage /> },
          { path: ROUTES.ORDERS, element: <MyOrdersPage /> },
          { path: `${ROUTES.ORDERS}/:orderId`, element: <OrderDetailsPage /> },
          { path: ROUTES.CHECKOUT, element: <CheckoutPage /> },
          { path: ROUTES.ORDER_SUCCESS, element: <OrderSuccessPage /> },
          { path: ROUTES.ADDRESSES, element: <SavedAddressesPage /> },
        ],
      },
    ],
  },
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: ROUTES.LOGIN, element: <LoginPage /> },
          { path: ROUTES.REGISTER, element: <RegisterPage /> },
        ],
      },
    ],
  },
  { path: ROUTES.ADMIN.LOGIN, element: <AdminLoginPage /> },
  {
    element: <AdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: ROUTES.ADMIN.DASHBOARD, element: <AdminDashboardPage /> },
          {
            path: ROUTES.ADMIN.CATEGORIES,
            element: <AdminCategoriesPage />,
          },
          { path: ROUTES.ADMIN.DISHES, element: <AdminDishesPage /> },
          { path: ROUTES.ADMIN.ORDERS, element: <AdminOrdersPage /> },
          {
            path: ROUTES.ADMIN.CUSTOMERS,
            element: <AdminCustomersPage />,
          },
          { path: ROUTES.ADMIN.DELIVERY, element: <AdminDeliveryPage /> },
          { path: ROUTES.ADMIN.OFFERS, element: <AdminOffersPage /> },
          { path: ROUTES.ADMIN.REPORTS, element: <AdminReportsPage /> },
          { path: ROUTES.ADMIN.SETTINGS, element: <AdminSettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.HOME} replace /> },
])
