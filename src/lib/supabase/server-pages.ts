
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextApiRequest, type NextApiResponse } from 'next'
import type { Database } from '../database.types'

// This is a modified version of the server client specifically for Pages Router API routes
export const createClient = (
    { req, res }: { req: NextApiRequest, res: NextApiResponse }
) => {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies[name]
        },
        set(name: string, value: string, options: CookieOptions) {
            // The NextApiResponse doesn't have a direct `cookies.set`, so we would typically use a library like `cookie`
            // For simplicity here, we're assuming the main session management happens elsewhere (e.g., middleware)
            // and this API route primarily reads the session.
        },
        remove(name: string, options: CookieOptions) {
            // Same as above.
        },
      },
    }
  )

  return supabase
}
