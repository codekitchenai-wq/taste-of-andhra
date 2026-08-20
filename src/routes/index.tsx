import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/ROUTES'
import { MainLayout } from '@/layouts/MainLayout'
import { PlatformLayout } from '@/layouts/PlatformLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DeliveryLayout } from '@/layouts/DeliveryLayout'
import { ProtectedRoute } from '@/components/routing/ProtectedRoute'
import { AdminRoute } from '@/components/routing/AdminRoute'
import { DeliveryRoute } from '@/components/routing/DeliveryRoute'
import { GuestRoute } from '@/components/routing/GuestRoute'
import {
  MasterLayout,
  MasterRoute,
} from '@/components/routing/MasterRoute'
import { isPlatformMarketingHost } from '@/utils/platformHost'

const HomePage = lazy(() => import('@/pages/public/HomePage'))
const AboutPage = lazy(() => import('@/pages/public/AboutPage'))
const MenuPage = lazy(() => import('@/pages/public/MenuPage'))
const LightMenuPage = lazy(() => import('@/pages/public/LightMenuPage'))
const DishDetailsPage = lazy(() => import('@/pages/public/DishDetailsPage'))
const GalleryPage = lazy(() => import('@/pages/public/GalleryPage'))
const ContactPage = lazy(() => import('@/pages/public/ContactPage'))
const PrivacyPolicyPage = lazy(
  () => import('@/pages/public/PrivacyPolicyPage'),
)
const PartyOrderPage = lazy(() => import('@/pages/public/PartyOrderPage'))
const OnamSpecialPage = lazy(() => import('@/pages/public/OnamSpecialPage'))
const QrMenuPage = lazy(() => import('@/pages/public/QrMenuPage'))
const BranchMenuPage = lazy(() => import('@/pages/public/BranchMenuPage'))

const PlatformLandingPage = lazy(
  () => import('@/pages/platform/PlatformLandingPage'),
)
const PlatformDemoPage = lazy(
  () => import('@/pages/platform/PlatformDemoPage'),
)

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
const FavoritesPage = lazy(() => import('@/pages/customer/FavoritesPage'))
const NotificationsPage = lazy(
  () => import('@/pages/customer/NotificationsPage'),
)
const InvoicePage = lazy(() => import('@/pages/customer/InvoicePage'))
const OrderPaymentSharePage = lazy(
  () => import('@/pages/public/OrderPaymentSharePage'),
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
const AdminDeliveryPartnersPage = lazy(
  () => import('@/pages/admin/AdminDeliveryPartnersPage'),
)
const AdminOffersPage = lazy(() => import('@/pages/admin/AdminOffersPage'))
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage'))
const AdminSettingsPage = lazy(
  () => import('@/pages/admin/AdminSettingsPage'),
)
const AdminPartyInquiriesPage = lazy(
  () => import('@/pages/admin/AdminPartyInquiriesPage'),
)
const AdminBranchesPage = lazy(
  () => import('@/pages/admin/AdminBranchesPage'),
)
const AdminQrTablesPage = lazy(
  () => import('@/pages/admin/AdminQrTablesPage'),
)
const AdminOnamOrdersPage = lazy(
  () => import('@/pages/admin/AdminOnamOrdersPage'),
)
const AdminPhoneOrderPage = lazy(
  () => import('@/pages/admin/AdminPhoneOrderPage'),
)

const DeliveryLoginPage = lazy(
  () => import('@/pages/delivery/DeliveryLoginPage'),
)
const DeliveryDashboardPage = lazy(
  () => import('@/pages/delivery/DeliveryDashboardPage'),
)
const DeliveryOrderPage = lazy(
  () => import('@/pages/delivery/DeliveryOrderPage'),
)

const MasterLoginPage = lazy(() => import('@/pages/master/MasterLoginPage'))
const MasterDashboardPage = lazy(
  () => import('@/pages/master/MasterDashboardPage'),
)
const MasterTenantsPage = lazy(() => import('@/pages/master/MasterTenantsPage'))
const MasterOnboardTenantPage = lazy(
  () => import('@/pages/master/MasterOnboardTenantPage'),
)
const MasterTenantDetailPage = lazy(
  () => import('@/pages/master/MasterTenantDetailPage'),
)
const MasterStarterIntakePage = lazy(
  () => import('@/pages/master/MasterStarterIntakePage'),
)
const StarterSetupWizardPage = lazy(
  () => import('@/pages/admin/StarterSetupWizardPage'),
)
const AdminStarterToolsPage = lazy(
  () => import('@/pages/admin/AdminStarterToolsPage'),
)

const sharedStaffRoutes = [
  { path: ROUTES.ADMIN.LOGIN, element: <AdminLoginPage /> },
  { path: ROUTES.DELIVERY.LOGIN, element: <DeliveryLoginPage /> },
  { path: ROUTES.MASTER.LOGIN, element: <MasterLoginPage /> },
  {
    element: <MasterRoute />,
    children: [
      {
        element: <MasterLayout />,
        children: [
          { path: ROUTES.MASTER.DASHBOARD, element: <MasterDashboardPage /> },
          { path: ROUTES.MASTER.TENANTS, element: <MasterTenantsPage /> },
          { path: ROUTES.MASTER.ONBOARD, element: <MasterOnboardTenantPage /> },
          {
            path: ROUTES.MASTER.STARTER_INTAKE,
            element: <MasterStarterIntakePage />,
          },
          {
            path: '/master/website-starter',
            element: <MasterStarterIntakePage />,
          },
          {
            path: '/master/tenants/:orgId',
            element: <MasterTenantDetailPage />,
          },
          { path: ROUTES.MASTER.FEATURES, element: <MasterFeaturesPage /> },
        ],
      },
    ],
  },
  {
    path: '/setup/:token',
    element: <StarterSetupWizardPage />,
  },
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
            path: ROUTES.ADMIN.ONAM_ORDERS,
            element: <AdminOnamOrdersPage />,
          },
          {
            path: ROUTES.ADMIN.PHONE_ORDER,
            element: <AdminPhoneOrderPage />,
          },
          {
            path: ROUTES.ADMIN.CUSTOMERS,
            element: <AdminCustomersPage />,
          },
          { path: ROUTES.ADMIN.DELIVERY, element: <AdminDeliveryPage /> },
          {
            path: ROUTES.ADMIN.DELIVERY_PARTNERS,
            element: <AdminDeliveryPartnersPage />,
          },
          { path: ROUTES.ADMIN.OFFERS, element: <AdminOffersPage /> },
          {
            path: ROUTES.ADMIN.PARTY_INQUIRIES,
            element: <AdminPartyInquiriesPage />,
          },
          { path: ROUTES.ADMIN.BRANCHES, element: <AdminBranchesPage /> },
          { path: ROUTES.ADMIN.QR_TABLES, element: <AdminQrTablesPage /> },
          { path: ROUTES.ADMIN.REPORTS, element: <AdminReportsPage /> },
          { path: ROUTES.ADMIN.SETTINGS, element: <AdminSettingsPage /> },
          { path: ROUTES.ADMIN.SETUP, element: <StarterSetupWizardPage /> },
          {
            path: ROUTES.ADMIN.STARTER_TOOLS,
            element: <AdminStarterToolsPage />,
          },
        ],
      },
    ],
  },
  {
    element: <DeliveryRoute />,
    children: [
      {
        element: <DeliveryLayout />,
        children: [
          { path: ROUTES.DELIVERY.DASHBOARD, element: <DeliveryDashboardPage /> },
          {
            path: `${ROUTES.DELIVERY.DASHBOARD}/:deliveryId`,
            element: <DeliveryOrderPage />,
          },
        ],
      },
    ],
  },
]

const platformMarketingRoutes = [
  {
    element: <PlatformLayout />,
    children: [
      { index: true, element: <PlatformLandingPage /> },
      { path: ROUTES.PLATFORM.DEMO, element: <PlatformDemoPage /> },
      { path: ROUTES.PRIVACY, element: <PrivacyPolicyPage /> },
    ],
  },
  ...sharedStaffRoutes,
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [{ path: ROUTES.LOGIN, element: <LoginPage /> }],
      },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.HOME} replace /> },
]

const restaurantStorefrontRoutes = [
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: ROUTES.ABOUT, element: <AboutPage /> },
      { path: ROUTES.MENU, element: <MenuPage /> },
      { path: ROUTES.LIGHT_MENU, element: <LightMenuPage /> },
      { path: `${ROUTES.MENU}/:slug`, element: <DishDetailsPage /> },
      { path: ROUTES.GALLERY, element: <GalleryPage /> },
      { path: ROUTES.CONTACT, element: <ContactPage /> },
      { path: ROUTES.PRIVACY, element: <PrivacyPolicyPage /> },
      { path: ROUTES.PARTY_ORDER, element: <PartyOrderPage /> },
      { path: ROUTES.ONAM, element: <OnamSpecialPage /> },
      { path: 'qr/:tableCode', element: <QrMenuPage /> },
      { path: 'b/:slug', element: <BranchMenuPage /> },
      { path: 'pay/:token', element: <OrderPaymentSharePage /> },
      { path: ROUTES.CART, element: <CartPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: ROUTES.PROFILE, element: <ProfilePage /> },
          { path: ROUTES.ORDERS, element: <MyOrdersPage /> },
          { path: `${ROUTES.ORDERS}/:orderId`, element: <OrderDetailsPage /> },
          {
            path: `${ROUTES.ORDERS}/:orderId/invoice`,
            element: <InvoicePage />,
          },
          { path: ROUTES.CHECKOUT, element: <CheckoutPage /> },
          { path: ROUTES.ORDER_SUCCESS, element: <OrderSuccessPage /> },
          { path: ROUTES.ADDRESSES, element: <SavedAddressesPage /> },
          { path: ROUTES.FAVORITES, element: <FavoritesPage /> },
          { path: ROUTES.NOTIFICATIONS, element: <NotificationsPage /> },
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
  ...sharedStaffRoutes,
  { path: '*', element: <Navigate to={ROUTES.HOME} replace /> },
]

export function createAppRouter() {
  return createBrowserRouter(
    isPlatformMarketingHost()
      ? platformMarketingRoutes
      : restaurantStorefrontRoutes,
  )
}

export const router = createAppRouter()
