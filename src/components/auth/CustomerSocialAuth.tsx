import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'

interface CustomerSocialAuthProps {
  redirectTo: string
}

/** Google sign-in shown above email/WhatsApp on customer login and register. */
export function CustomerSocialAuth({ redirectTo }: CustomerSocialAuthProps) {
  return (
    <div className="space-y-6">
      <GoogleSignInButton redirectTo={redirectTo} />
      <div className="flex items-center gap-3 text-xs text-text-secondary">
        <span className="h-px flex-1 bg-black/10" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-black/10" />
      </div>
    </div>
  )
}
