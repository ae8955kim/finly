import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      const missingVars = []
      if (!url) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
      if (!key) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
      
      console.error('[v0] Missing Supabase environment variables:', {
        missing: missingVars,
        urlExists: !!url,
        keyExists: !!key,
        environment: process.env.NODE_ENV,
      })
      throw new Error(`Supabase credentials not configured. Missing: ${missingVars.join(', ')}`)
    }

    console.log('[v0] Supabase client created successfully', {
      urlLength: url.length,
      keyLength: key.length,
      environment: process.env.NODE_ENV,
    })

    return createBrowserClient(
      url,
      key,
      {
        // Secure cookies in production; not in dev, so localhost still works.
        cookieOptions: { secure: process.env.NODE_ENV === 'production' },
      },
    )
  } catch (error) {
    console.error('[v0] Failed to create Supabase client:', {
      message: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.constructor.name : typeof error,
    })
    throw error
  }
}
