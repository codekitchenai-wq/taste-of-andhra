import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Pencil } from 'lucide-react'
import { ProfileSectionCard } from '@/components/customer/ProfileSectionCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
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
  const [isEditing, setIsEditing] = useState(false)
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
      loyaltyService.getTransactions(6),
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
    setIsEditing(false)
  }

  const cancelEdit = () => {
    profileForm.reset({
      fullName: user?.full_name ?? '',
      phone: user?.phone ?? '',
    })
    setIsEditing(false)
  }

  if (isLoading) {
    return <LoadingState variant="inline" />
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <ProfileSectionCard
        title="Personal information"
        action={
          isEditing ? null : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
          )
        }
      >
        {isEditing ? (
          <form
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            className="space-y-3"
            noValidate
          >
            <Input
              compact
              label="Full name"
              error={profileForm.formState.errors.fullName?.message}
              {...profileForm.register('fullName', {
                required: 'Full name is required',
              })}
            />
            <Input
              compact
              label="Mobile number"
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
              <Input compact label="Email" value={user.email} disabled readOnly />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={cancelEdit}
                disabled={isSavingProfile}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <dl className="divide-y divide-black/5">
            <ProfileField label="Full name" value={user.full_name || '—'} />
            <ProfileField
              label="Mobile number"
              value={
                user.phone ? `+91 ${formatIndianPhone(user.phone)}` : '—'
              }
            />
            <ProfileField label="Email" value={user.email || '—'} />
          </dl>
        )}
      </ProfileSectionCard>

      {loyalty ? (
        <ProfileSectionCard title="Loyalty points">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-primary">
              {loyalty.points_balance}
            </p>
            <p className="text-sm text-text-secondary">
              Lifetime {loyalty.lifetime_earned} · 1 point per ₹1
            </p>
          </div>
          {loyaltyHistory.length > 0 ? (
            <ul className="mt-3 divide-y divide-black/5 text-sm">
              {loyaltyHistory.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-3 py-1.5"
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
    </div>
  )
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-sm text-text-secondary">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-text-primary">
        {value}
      </dd>
    </div>
  )
}
