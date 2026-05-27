import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { getTeamFlag, getTeamStrength } from '@/lib/wc2026-teams'

export const dynamic = 'force-dynamic'

const OPENFOOTBALL_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

interface OFMatch {
  date: string
  time?: string
  team1: string
  team2: string
  group?: string
  score?: { ft?: [number, number] }
}

interface GroupData {
  name: string
  teams: string[]
  matches: Array<OFMatch & { fixtureId?: string; dbScore?: [number, number] | null; groupName: string }>
}

interface Standing {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  pts: number
}

async function getGroupData(): Promise<{ groups: GroupData[]; seeded: boolean }> {
  let ofMatches: OFMatch[] = []
  try {
    const res = await fetch(OPENFOOTBALL_URL, { next: { revalidate: 3600 } } as RequestInit)
    if (res.ok) {
      const json = await res.json()
      ofMatches = (json.matches ?? []) as OFMatch[]
    }
  } catch {
    // network failure — fall through with empty data
  }

  const groupMap = new Map<string, { teams: Set<string>; matches: OFMatch[] }>()
  for (const m of ofMatches) {
    if (!m.group || !m.team1 || !m.team2) continue
    if (
      m.team1.includes('Winner') || m.team1.includes('Loser') || m.team1.includes('Group') ||
      m.team2.includes('Winner') || m.team2.includes('Loser') || m.team2.includes('Group')
    ) continue
    if (!groupMap.has(m.group)) groupMap.set(m.group, { teams: new Set(), matches: [] })
    const g = groupMap.get(m.group)!
    g.teams.add(m.team1)
    g.teams.add(m.team2)
    g.matches.push(m)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const fixtureMap = new Map<string, { id: string; home_score: number | null; away_score: number | null }>()
  let seeded = false

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: league } = await supabase
      .from('leagues')
      .select('id')
      .eq('name', 'FIFA World Cup 2026')
      .single()
    if (league) {
      seeded = true
      const { data: fixtures } = await supabase
        .from('fixtures')
        .select('id, home_score, away_score, home_team:teams!fixtures_home_team_id_fkey(name), away_team:teams!fixtures_away_team_id_fkey(name)')
        .eq('league_id', league.id)
      for (const f of fixtures ?? []) {
        const key = `${(f as any).home_team?.name}:${(f as any).away_team?.name}`
        fixtureMap.set(key, { id: f.id, home_score: f.home_score, away_score: f.away_score })
      }
    }
  }

  const sortedGroups = [...groupMap.entries()].sort(([a], [b]) => a.localeCompare(b))
  const groups: GroupData[] = sortedGroups.map(([groupName, { teams, matches }]) => ({
    name: groupName,
    teams: [...teams],
    matches: matches
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => {
        const db = fixtureMap.get(`${m.team1}:${m.team2}`)
        return {
          ...m,
          groupName,
          fixtureId: db?.id,
          dbScore:
            db && db.home_score !== null && db.away_score !== null
              ? [db.home_score, db.away_score]
              : null,
        }
      }),
  }))

  return { groups, seeded }
}

function computeStandings(teams: string[], matches: GroupData['matches']): Standing[] {
  const table: Record<string, Standing> = {}
  for (const t of teams) {
    table[t] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 }
  }
  for (const m of matches) {
    const score = m.dbScore ?? (m.score?.ft ? m.score.ft : null)
    if (!score) continue
    const [hg, ag] = score
    const h = table[m.team1]
    const a = table[m.team2]
    if (!h || !a) continue
    h.played++; a.played++
    h.gf += hg; h.ga += ag
    a.gf += ag; a.ga += hg
    if (hg > ag) { h.won++; h.pts += 3; a.lost++ }
    else if (hg < ag) { a.won++; a.pts += 3; h.lost++ }
    else { h.drawn++; h.pts++; a.drawn++; a.pts++ }
  }
  return Object.values(table).sort(
    (a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
  )
}

function qualBadge(rank: number) {
  if (rank === 1) return <span className="ml-1 text-xs text-green-400 font-bold">Q</span>
  if (rank === 2) return <span className="ml-1 text-xs text-green-600 font-bold">Q</span>
  return null
}

export default async function WC2026Page() {
  const { groups, seeded } = await getGroupData()

  // Flatten all matches and group by date
  const allMatches = groups.flatMap((g) => g.matches)
  const matchesByDate = new Map<string, typeof allMatches>()
  for (const m of allMatches) {
    if (!matchesByDate.has(m.date)) matchesByDate.set(m.date, [])
    matchesByDate.get(m.date)!.push(m)
  }
  const sortedDates = [...matchesByDate.keys()].sort()

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">🏆 FIFA World Cup 2026</h1>
          <p className="text-gray-400 mt-1">
            Group stage — 12 groups, 48 teams
            {allMatches.length > 0 && ` · ${allMatches.length} fixtures`}
          </p>
        </div>
        {!seeded && (
          <Link
            href="/admin"
            className="text-sm bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Seed data →
          </Link>
        )}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <p className="text-gray-500">
            No fixture data available. Go to{' '}
            <Link href="/admin" className="text-blue-400 underline">/admin</Link>{' '}
            and click "Seed WC 2026 Data".
          </p>
        </div>
      )}

      {/* Fixtures by Date */}
      {sortedDates.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">All Fixtures by Date</h2>
          {sortedDates.map((date) => {
            const dayMatches = matchesByDate.get(date)!
            const label = new Date(date).toLocaleDateString([], {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            })
            return (
              <div key={date}>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                  {label} · {dayMatches.length} match{dayMatches.length !== 1 ? 'es' : ''}
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
                  {dayMatches.map((m, i) => {
                    const score = m.dbScore ?? (m.score?.ft ?? null)
                    return (
                      <div key={i} className="px-4 py-3 flex items-center gap-2 text-sm">
                        <span className="text-xs text-gray-600 w-16 shrink-0">{m.groupName}</span>
                        <span className="flex-1 text-right text-gray-200 font-medium">
                          {getTeamFlag(m.team1)} {m.team1}
                        </span>
                        {score ? (
                          <span className="text-white font-bold w-12 text-center shrink-0">
                            {score[0]} – {score[1]}
                          </span>
                        ) : (
                          <span className="text-gray-600 w-12 text-center shrink-0 text-xs">vs</span>
                        )}
                        <span className="flex-1 text-gray-200 font-medium">
                          {getTeamFlag(m.team2)} {m.team2}
                        </span>
                        {m.fixtureId ? (
                          <Link
                            href={`/simulations/new?fixture=${m.fixtureId}`}
                            className="text-xs text-blue-500 hover:text-blue-400 shrink-0 w-10 text-right"
                          >
                            Sim →
                          </Link>
                        ) : (
                          <span className="w-10 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Amazon affiliate banner */}
      <div className="bg-gradient-to-r from-yellow-950/60 to-orange-950/60 border border-yellow-800/50 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-yellow-300 text-lg">⚽ World Cup 2026 Gear</div>
          <div className="text-sm text-gray-400 mt-1">Shop official kits, balls, and fan merchandise on Amazon</div>
        </div>
        <a
          href="https://amzn.to/3RXfM29"
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="shrink-0 flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-colors"
        >
          🛒 Shop on Amazon
        </a>
      </div>

      {/* Group Standings */}
      {groups.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Group Standings</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {groups.map((group) => {
              const standings = computeStandings(group.teams, group.matches)
              return (
                <div key={group.name} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-gray-800/60">
                    <h3 className="font-bold text-white">{group.name}</h3>
                  </div>
                  <div className="px-5 py-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-800">
                          <th className="text-left pb-2 font-medium">Team</th>
                          <th className="text-center pb-2 font-medium w-6">P</th>
                          <th className="text-center pb-2 font-medium w-6">W</th>
                          <th className="text-center pb-2 font-medium w-6">D</th>
                          <th className="text-center pb-2 font-medium w-6">L</th>
                          <th className="text-center pb-2 font-medium w-10">GD</th>
                          <th className="text-center pb-2 font-medium w-8 text-white">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((s, i) => (
                          <tr key={s.team} className={`border-b border-gray-800/50 ${i < 2 ? 'text-gray-200' : 'text-gray-400'}`}>
                            <td className="py-1.5">
                              <span className="mr-1">{getTeamFlag(s.team)}</span>
                              {s.team}
                              {qualBadge(i + 1)}
                            </td>
                            <td className="text-center">{s.played}</td>
                            <td className="text-center">{s.won}</td>
                            <td className="text-center">{s.drawn}</td>
                            <td className="text-center">{s.lost}</td>
                            <td className="text-center">{s.gf - s.ga >= 0 ? '+' : ''}{s.gf - s.ga}</td>
                            <td className="text-center font-bold text-white">{s.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
