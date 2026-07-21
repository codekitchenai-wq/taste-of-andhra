import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { formatIndianPhone } from '@/utils/phone'

interface ProfileFormValues {
  fullName: string
  phone: string
}

export default function ProfilePage() {
  const { user, isLoading, updateProfile } = useAuth()
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const profileForm = useForm<ProfileFormValues>({
    values: {
      fullName: user?.full_name ?? '',
      phone: user?.phone ?? '',
    },
  })

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
        description="Manage your personal information."
      />

      <section className="mt-8 max-w-xl rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <h2 className="text-lg font-semibold text-text-primary">
          Personal Information
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Signed in with mobile OTP
          {user.phone ? `: +91 ${formatIndianPhone(user.phone)}` : ''}
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
    </Container>
  )
}
