import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const tables = ['sports', 'leagues', 'teams', 'fixtures', 'simulations', 'api_cache'] as const

  const counts: Record<string, number | string> = {}

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      counts[table] = `ERROR: ${error.message}`
    } else {
      counts[table] = count ?? 0
    }
  }

  // Check most recent api_cache entry
  const { data: lastCache } = await supabase
    .from('api_cache')
    .select('cache_key, expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    counts,
    lastCacheEntry: lastCache ?? null,
    checkedAt: new Date().toISOString(),
  })
}
