import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const TARGET_NAMES = [
  'FIFA World Cup 2026',
  'Premier League 2024/25',
  'UEFA Champions League 2024/25',
  'NBA 2024/25',
  'NFL 2024/25',
  'NHL 2024/25',
  'ICC Cricket World Cup',
]

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: leagues, error } = await supabase.from('leagues').select('id, name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: fixtures } = await supabase.from('fixtures').select('league_id')
  const countByLeague = new Map<string, number>()
  for (const f of fixtures ?? []) {
    if (f.league_id) countByLeague.set(f.league_id, (countByLeague.get(f.league_id) ?? 0) + 1)
  }

  const deleted: string[] = []
  const kept: string[] = []

  // Deduplicate target leagues — keep the one with the most fixtures
  for (const name of TARGET_NAMES) {
    const matching = (leagues ?? []).filter((l) => l.name === name)
    if (matching.length === 0) { kept.push(`${name} — not found`); continue }
    if (matching.length === 1) { kept.push(`${name} (${matching[0].id})`); continue }

    const sorted = [...matching].sort(
      (a, b) => (countByLeague.get(b.id) ?? 0) - (countByLeague.get(a.id) ?? 0)
    )
    const winner = sorted[0]
    kept.push(`${name} → keeping ${winner.id} (${countByLeague.get(winner.id) ?? 0} fixtures)`)

    for (const loser of sorted.slice(1)) {
      if ((countByLeague.get(loser.id) ?? 0) > 0) {
        await supabase.from('fixtures').update({ league_id: winner.id }).eq('league_id', loser.id)
      }
      await supabase.from('leagues').delete().eq('id', loser.id)
      deleted.push(`${loser.name} (${loser.id}) — duplicate removed`)
    }
  }

  // Delete non-target leagues that have no fixtures
  for (const league of leagues ?? []) {
    if (TARGET_NAMES.includes(league.name)) continue
    if ((countByLeague.get(league.id) ?? 0) > 0) {
      kept.push(`${league.name} (${league.id}) — kept (has fixtures)`)
    } else {
      await supabase.from('leagues').delete().eq('id', league.id)
      deleted.push(`${league.name} (${league.id}) — removed`)
    }
  }

  return NextResponse.json({ deleted, kept, deletedCount: deleted.length })
}
