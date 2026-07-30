import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      const missingVars = []
      if (!url) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
      if (!key) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
      
      console.error('[v0] Missing Supabase environment variables (server):', {
        missing: missingVars,
        urlExists: !!url,
        keyExists: !!key,
        environment: process.env.NODE_ENV,
      })
      throw new Error(`Supabase credentials not configured. Missing: ${missingVars.join(', ')}`)
    }

    console.log('[v0] Server Supabase client creating...', {
      urlLength: url.length,
      keyLength: key.length,
      environment: process.env.NODE_ENV,
    })

    const cookieStore = await cookies()

    const client = createServerClient(
      url,
      key,
      {
        // Secure cookies in production; not in dev, so localhost still works.
        cookieOptions: { secure: process.env.NODE_ENV === 'production' },
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              )
            } catch {
              // The "setAll" method was called from a Server Component.
              // This can be ignored if you have proxy refreshing
              // user sessions.
            }
          },
        },
      },
    )

    console.log('[v0] Server Supabase client created successfully')
    return client
  } catch (error) {
    console.error('[v0] Failed to create server Supabase client:', {
      message: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.constructor.name : typeof error,
    })
    throw error
  }
}
