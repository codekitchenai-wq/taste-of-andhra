import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'public-anon-key'

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co') &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseUrl.includes('your-actual-ref') &&
    !supabaseUrl.includes('placeholder.supabase.co') &&
    supabaseAnonKey !== 'your_supabase_anon_key' &&
    supabaseAnonKey.length > 80,
)

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not configured. Copy .env.example to .env.local and add your credentials.',
  )
}

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : PLACEHOLDER_URL,
  isSupabaseConfigured ? supabaseAnonKey : PLACEHOLDER_KEY,
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
    },
  },
)
