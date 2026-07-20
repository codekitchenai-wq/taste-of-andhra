import { Link } from 'react-router-dom'
import { APP_NAME } from '@/constants/APP'
import { ROUTES } from '@/constants/ROUTES'
import { Container } from '@/components/ui/Container'

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Container className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-3xl font-bold text-primary">
              {APP_NAME}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">Admin Portal</p>
          </div>
          <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md md:p-8">
            <h2 className="text-xl font-semibold">Admin Login</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Restaurant staff sign in to manage operations.
            </p>
            <p className="mt-6 rounded-[var(--radius-input)] border border-dashed border-gray-300 bg-background px-4 py-6 text-center text-sm text-text-secondary">
              Admin login form will be implemented in the authentication
              milestone.
            </p>
          </div>
          <p className="mt-6 text-center text-sm text-text-secondary">
            <Link to={ROUTES.HOME} className="text-primary hover:underline">
              Back to website
            </Link>
          </p>
        </div>
      </Container>
    </div>
  )
}
