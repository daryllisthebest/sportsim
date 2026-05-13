import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DATA_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    const res = await fetch(DATA_URL)
    if (!res.ok) throw new Error(`Failed to fetch data: ${res.status}`)
    const { matches } = await res.json() as { matches: any[] }

    // 1. Ensure sport
    let { data: sport } = await supabase.from('sports').select('id').eq('name', 'Football').single()
    if (!sport) {
      const { data, error } = await supabase.from('sports').insert({ name: 'Football', icon: '⚽' }).select('id').single()
      if (error || !data) throw new Error(`Sport insert failed: ${error?.message}`)
      sport = data
    }

    // 2. Ensure league
    let { data: league } = await supabase.from('leagues').select('id').eq('name', 'FIFA World Cup 2026').single()
    if (!league) {
      const { data, error } = await supabase
        .from('leagues')
        .insert({ sport_id: sport.id, name: 'FIFA World Cup 2026', season: 2026 })
        .select('id')
        .single()
      if (error || !data) throw new Error(`League insert failed: ${error?.message}`)
      league = data
    }

    // 3. Collect unique team names (skip TBD knockout placeholders)
    const teamNames = new Set<string>()
    for (const m of matches) {
      if (m.team1 && !m.team1.startsWith('Winner') && !m.team1.startsWith('Loser') && !m.team1.includes('Group')) teamNames.add(m.team1)
      if (m.team2 && !m.team2.startsWith('Winner') && !m.team2.startsWith('Loser') && !m.team2.includes('Group')) teamNames.add(m.team2)
    }

    // 4. Upsert teams
    const teamMap = new Map<string, number>()
    const { data: existingTeams } = await supabase.from('teams').select('id, name').eq('league_id', league.id)
    for (const t of existingTeams ?? []) teamMap.set(t.name, t.id)

    const newTeams = [...teamNames].filter(n => !teamMap.has(n)).map(name => ({ league_id: league.id, name }))
    if (newTeams.length) {
      const { data: inserted, error } = await supabase.from('teams').insert(newTeams).select('id, name')
      if (error) throw new Error(`Teams insert failed: ${error.message}`)
      for (const t of inserted ?? []) teamMap.set(t.name, t.id)
    }

    // 5. Insert group stage fixtures
    const fixtures = matches
      .filter(m => m.group && teamMap.has(m.team1) && teamMap.has(m.team2))
      .map(m => ({
        league_id: league.id,
        home_team_id: teamMap.get(m.team1)!,
        away_team_id: teamMap.get(m.team2)!,
        kickoff_at: m.time ? `${m.date}T${m.time}` : `${m.date}T00:00:00`,
        status: 'NS',
      }))

    if (fixtures.length) {
      const { error } = await supabase.from('fixtures').insert(fixtures)
      if (error) throw new Error(`Fixtures insert failed: ${error.message}`)
    }

    return NextResponse.json({
      ok: true,
      teams: teamMap.size,
      fixtures: fixtures.length,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
