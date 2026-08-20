import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/ROUTES'
import type { StorefrontAccessReason } from '@/utils/websiteStarter'

const COPY: Record<
  Exclude<StorefrontAccessReason, 'ok'>,
  { title: string; body: string }
> = {
  pending_setup: {
    title: 'Restaurant setup in progress',
    body: 'This DirectApp website is being prepared. Please check back soon.',
  },
  pending_review: {
    title: 'Almost ready',
    body: 'Details are under review. The public menu will open after approval.',
  },
  rejected: {
    title: 'Setup needs updates',
    body: 'Please contact DirectApp support or complete the requested changes.',
  },
  fssai_expired: {
    title: 'FSSAI licence expired',
    body: 'This restaurant site is temporarily unavailable until a valid FSSAI certificate is uploaded.',
  },
  suspended: {
    title: 'Restaurant unavailable',
    body: 'This restaurant is not accepting visitors right now.',
  },
}

export function StorefrontAccessGate({
  reason,
}: {
  reason: Exclude<StorefrontAccessReason, 'ok'>
}) {
  const copy = COPY[reason]
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          {copy.title}
        </h1>
        <p className="mt-3 text-text-secondary">{copy.body}</p>
        {reason === 'fssai_expired' && (
          <p className="mt-4 text-sm">
            Restaurant admin:{' '}
            <Link className="text-primary underline" to={ROUTES.ADMIN.SETUP}>
              renew FSSAI in setup
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
