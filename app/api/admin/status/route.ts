import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !url.startsWith('http') || !key) {
      return NextResponse.json({ error: 'Missing or invalid Supabase env vars', hasUrl: !!url, hasKey: !!key }, { status: 500 })
    }

    const supabase = createClient(url, key)

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
      supabaseUrl: url,
      counts,
      lastCacheEntry: lastCache ?? null,
      checkedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
