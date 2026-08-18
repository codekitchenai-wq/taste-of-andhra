import { Outlet } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { useOrganization } from '@/contexts/OrganizationContext'
import { storefrontContact } from '@/utils/storefrontCopy'
import { useTenantDocumentTitle } from '@/hooks/useTenantDocumentTitle'

export function AuthLayout() {
  const org = useOrganization()
  const contact = storefrontContact(org)
  useTenantDocumentTitle('Sign in')

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Container className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-3xl font-bold text-primary">
              {contact.name}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Sign in to continue your culinary journey
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md md:p-8">
            <Outlet />
          </div>
        </div>
      </Container>
    </div>
  )
}
