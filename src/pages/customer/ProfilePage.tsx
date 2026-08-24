import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ProfileAddressesSection } from '@/components/addresses/ProfileAddressesSection'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ROUTES } from '@/constants/ROUTES'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useAuth } from '@/hooks/useAuth'
import * as loyaltyService from '@/services/loyaltyService'
import type { LoyaltyAccount, LoyaltyTransaction } from '@/types/Loyalty'
import { formatIndianPhone } from '@/utils/phone'

interface ProfileFormValues {
  fullName: string
  phone: string
}

export default function ProfilePage() {
  const { user, isLoading, updateProfile } = useAuth()
  const { organizationId } = useOrganization()
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [loyalty, setLoyalty] = useState<LoyaltyAccount | null>(null)
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyTransaction[]>([])

  const profileForm = useForm<ProfileFormValues>({
    values: {
      fullName: user?.full_name ?? '',
      phone: user?.phone ?? '',
    },
  })

  useEffect(() => {
    if (!user) return
    void Promise.all([
      loyaltyService.getOrCreateAccount(),
      loyaltyService.getTransactions(8),
    ]).then(([accountResult, historyResult]) => {
      if (accountResult.success) setLoyalty(accountResult.data)
      if (historyResult.success) setLoyaltyHistory(historyResult.data)
    })
  }, [user, organizationId])

  const onProfileSubmit = async (values: ProfileFormValues) => {
    setIsSavingProfile(true)

    const result = await updateProfile({
      fullName: values.fullName,
      phone: values.phone,
    })

    setIsSavingProfile(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Profile updated')
  }

  if (isLoading) {
    return (
      <Container as="div" className="py-8 md:py-12">
        <LoadingState variant="inline" />
      </Container>
    )
  }

  if (!user) {
    return null
  }

  return (
    <Container as="div" className="py-8 md:py-12">
      <PageHeader
        title="Profile"
        description="Manage your personal information and delivery addresses."
      />

      <p className="mb-8 text-sm text-text-secondary">
        Looking for an order?{' '}
        <Link
          to={ROUTES.ORDERS}
          className="font-medium text-primary hover:text-primary-dark"
        >
          Check order status in My Orders
        </Link>
      </p>

      <section className="max-w-xl rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <h2 className="text-lg font-semibold text-text-primary">
          Personal Information
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Signed in with email
          {user.email ? `: ${user.email}` : ''}
          {user.phone ? ` · +91 ${formatIndianPhone(user.phone)}` : ''}
        </p>

        <form
          onSubmit={profileForm.handleSubmit(onProfileSubmit)}
          className="mt-6 space-y-4"
          noValidate
        >
          <Input
            label="Full Name"
            error={profileForm.formState.errors.fullName?.message}
            {...profileForm.register('fullName', {
              required: 'Full name is required',
            })}
          />
          <Input
            label="Mobile Number"
            inputMode="numeric"
            error={profileForm.formState.errors.phone?.message}
            {...profileForm.register('phone', {
              required: 'Phone is required',
              pattern: {
                value: /^\d{10}$/,
                message: 'Enter a valid 10-digit phone number',
              },
            })}
          />
          {user.email && (
            <Input label="Email" value={user.email} disabled readOnly />
          )}
          <Button type="submit" disabled={isSavingProfile}>
            {isSavingProfile ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </section>

      <ProfileAddressesSection />

      {loyalty && (
        <section className="mt-8 max-w-xl rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
          <h2 className="text-lg font-semibold text-text-primary">
            Loyalty Points
          </h2>
          <p className="mt-2 text-3xl font-bold text-primary">
            {loyalty.points_balance}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Lifetime earned: {loyalty.lifetime_earned} points · Earn 1 point per
            ₹1 on delivered orders
          </p>
          {loyaltyHistory.length > 0 && (
            <ul className="mt-4 divide-y divide-black/5 text-sm">
              {loyaltyHistory.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-text-secondary">
                    {tx.note ?? tx.transaction_type}
                  </span>
                  <span
                    className={
                      tx.points >= 0 ? 'font-medium text-success' : 'font-medium text-error'
                    }
                  >
                    {tx.points >= 0 ? '+' : ''}
                    {tx.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to={ROUTES.FAVORITES}
              className="text-sm font-medium text-primary hover:underline"
            >
              Favorites
            </Link>
            <Link
              to={ROUTES.NOTIFICATIONS}
              className="text-sm font-medium text-primary hover:underline"
            >
              Notifications
            </Link>
          </div>
        </section>
      )}
    </Container>
  )
}
