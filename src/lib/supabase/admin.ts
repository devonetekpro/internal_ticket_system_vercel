
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'

// This client is intended for server-side use only, for operations
// that require administrative privileges, such as deleting users.
// It uses the SERVICE_ROLE_KEY, which should be kept secret.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. This is required for admin operations.")
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
