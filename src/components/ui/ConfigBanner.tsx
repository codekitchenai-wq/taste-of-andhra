import { isSupabaseConfigured } from '@/services/supabaseClient'

export function ConfigBanner() {
  if (isSupabaseConfigured) return null

  return (
    <div
      role="alert"
      className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950"
    >
      <p className="font-medium">Supabase is not configured</p>
      <p className="mt-1 text-amber-900/80">
        Copy <code className="rounded bg-amber-100 px-1">.env.example</code> to{' '}
        <code className="rounded bg-amber-100 px-1">.env.local</code>, add your
        project URL and anon key, then restart the dev server.
      </p>
    </div>
  )
}
