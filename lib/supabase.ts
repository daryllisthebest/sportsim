import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

let _client: SupabaseClient<Database> | undefined

// Browser / client-component safe client (anon key)
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop: string | symbol) {
    if (!_client) {
      _client = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
    return (_client as any)[prop as string]
  },
})

// Server-side client: uses service role key when available so RLS never
// blocks reads or writes in server components and API routes.
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient<Database>(url, key)
}
