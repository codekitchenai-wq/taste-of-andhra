import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Bell, ClipboardList, Heart } from 'lucide-react'
import { ProfileAddressesSection } from '@/components/addresses/ProfileAddressesSection'
import { ProfileSectionCard } from '@/components/customer/ProfileSectionCard'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
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
      <Container as="div" className="py-6 md:py-8">
        <LoadingState variant="inline" />
      </Container>
    )
  }

  if (!user) {
    return null
  }

  return (
    <Container as="div" className="py-6 md:py-8 lg:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <header>
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
            Profile
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your details, delivery addresses, and rewards — all in one place.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          <ProfileSectionCard
            title="Personal information"
            description={
              user.email
                ? `Signed in as ${user.email}`
                : user.phone
                  ? `Signed in with +91 ${formatIndianPhone(user.phone)}`
                  : 'Update the name and number used on your orders.'
            }
          >
            <form
              onSubmit={profileForm.handleSubmit(onProfileSubmit)}
              className="space-y-4"
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
              {user.email ? (
                <Input label="Email" value={user.email} disabled readOnly />
              ) : null}
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </ProfileSectionCard>

          <div className="flex flex-col gap-5">
            {loyalty ? (
              <ProfileSectionCard
                title="Loyalty points"
                description="Earn 1 point per ₹1 on delivered orders."
              >
                <p className="text-3xl font-bold tracking-tight text-primary">
                  {loyalty.points_balance}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  Lifetime earned: {loyalty.lifetime_earned} points
                </p>
                {loyaltyHistory.length > 0 ? (
                  <ul className="mt-4 divide-y divide-black/5 text-sm">
                    {loyaltyHistory.map((tx) => (
                      <li
                        key={tx.id}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <span className="min-w-0 truncate text-text-secondary">
                          {tx.note ?? tx.transaction_type}
                        </span>
                        <span
                          className={
                            tx.points >= 0
                              ? 'shrink-0 font-medium text-success'
                              : 'shrink-0 font-medium text-error'
                          }
                        >
                          {tx.points >= 0 ? '+' : ''}
                          {tx.points}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </ProfileSectionCard>
            ) : null}

            <ProfileSectionCard title="Shortcuts">
              <nav className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                <ShortcutLink
                  to={ROUTES.ORDERS}
                  icon={ClipboardList}
                  label="My Orders"
                />
                <ShortcutLink
                  to={ROUTES.FAVORITES}
                  icon={Heart}
                  label="Favorites"
                />
                <ShortcutLink
                  to={ROUTES.NOTIFICATIONS}
                  icon={Bell}
                  label="Notifications"
                />
              </nav>
            </ProfileSectionCard>
          </div>
        </div>

        <ProfileAddressesSection />
      </div>
    </Container>
  )
}

function ShortcutLink({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: typeof Heart
  label: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-background px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-primary/20 hover:bg-primary/5"
    >
      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      {label}
    </Link>
  )
}
