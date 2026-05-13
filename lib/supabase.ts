import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

let _client: SupabaseClient<Database> | undefined

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
