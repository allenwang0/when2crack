import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'

function validateEnvVars() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    const missing = []
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!key) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please check your .env.local file.'
    )
  }

  return { url, key }
}

// Singleton instance - created once and reused
let clientInstance: SupabaseClient<Database> | null = null

export function createClient() {
  // Return existing instance if already created
  if (clientInstance) {
    return clientInstance
  }

  // Create new instance only on first call
  const { url, key } = validateEnvVars()
  clientInstance = createBrowserClient<Database>(url, key)

  return clientInstance
}
