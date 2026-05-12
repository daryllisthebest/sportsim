import { createClient } from '@supabase/supabase-js'

const API_HOST = 'v3.football.api-sports.io'

const TARGETS = [
  { label: 'FIFA World Cup 2026',           apiLeagueId: 1,  season: 2026 },
  { label: 'UEFA Champions League 2024/25', apiLeagueId: 2,  season: 2024 },
  { label: 'Premier League 2024/25',        apiLeagueId: 39, season: 2024 },
]

export interface SyncResult {
  ok: boolean
  startedAt: string
  finishedAt: string
  leagues: Array<{ label: string; teams: number; fixtures: number }>
  error?: string
}

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── API fetch with 1-hour api_cache ─────────────────────────────────────────

async function apiFetch(
  supabase: ReturnType<typeof makeSupabase>,
  endpoint: string,
  params: Record<string, string | number>
) {
  const url = new URL(`https://${API_HOST}/${endpoint}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const cacheKey = url.toString()

  const { data: cached } = await supabase
    .from('api_cache')
    .select('data, expires_at')
    .eq('cache_key', cacheKey)
    .single()

  if (cached && new Date(cached.expires_at) > new Date()) {
    return cached.data
  }

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! },
  })
  if (!res.ok) throw new Error(`API-Football ${res.status}: ${await res.text()}`)

  const json = await res.json()
  if (json.errors && Object.keys(json.errors).length) {
    throw new Error(`API-Football error: ${JSON.stringify(json.errors)}`)
  }

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  await supabase
    .from('api_cache')
    .upsert({ cache_key: cacheKey, data: json, expires_at: expiresAt }, { onConflict: 'cache_key' })

  await sleep(250)
  return json
}

// ─── League sync ─────────────────────────────────────────────────────────────

async function ensureFootballSport(supabase: ReturnType<typeof makeSupabase>) {
  const { data } = await supabase.from('sports').select('id').eq('name', 'Football').single()
  if (data) return data.id

  const { data: inserted, error } = await supabase
    .from('sports')
    .insert({ name: 'Football', icon: '⚽' })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(`Could not find/insert Football sport: ${error?.message}`)
  return inserted.id
}

async function syncLeague(
  supabase: ReturnType<typeof makeSupabase>,
  sportId: number,
  target: (typeof TARGETS)[number]
): Promise<{ teams: number; fixtures: number }> {
  // Upsert league
  const { data: leagueRow, error } = await supabase
    .from('leagues')
    .upsert(
      { sport_id: sportId, name: target.label, api_football_id: target.apiLeagueId, season: target.season },
      { onConflict: 'api_football_id' }
    )
    .select('id')
    .single()

  if (error || !leagueRow) throw new Error(`League upsert failed: ${error?.message}`)
  const leagueDbId = leagueRow.id

  // Teams
  const teamsJson = await apiFetch(supabase, 'teams', { league: target.apiLeagueId, season: target.season })
  const teamsPayload = (teamsJson.response ?? []).map((t: any) => ({
    league_id: leagueDbId,
    name: t.team.name as string,
    logo_url: t.team.logo as string | null,
    api_football_id: t.team.id as number,
  }))

  if (teamsPayload.length) {
    const { error: teamsErr } = await supabase
      .from('teams')
      .upsert(teamsPayload, { onConflict: 'api_football_id,league_id' })
    if (teamsErr) console.warn(`[sync] teams upsert warning: ${teamsErr.message}`)
  }

  // Build api_football_id → db id map
  const { data: dbTeams } = await supabase
    .from('teams')
    .select('id, api_football_id')
    .eq('league_id', leagueDbId)

  const teamMap = new Map<number, number>()
  for (const t of dbTeams ?? []) {
    if (t.api_football_id) teamMap.set(t.api_football_id, t.id)
  }

  // Fixtures
  const fixturesJson = await apiFetch(supabase, 'fixtures', { league: target.apiLeagueId, season: target.season })
  const fixturesPayload: any[] = []

  for (const f of fixturesJson.response ?? []) {
    const homeDbId = teamMap.get(f.teams.home.id)
    const awayDbId = teamMap.get(f.teams.away.id)
    if (!homeDbId || !awayDbId) continue

    fixturesPayload.push({
      league_id: leagueDbId,
      home_team_id: homeDbId,
      away_team_id: awayDbId,
      kickoff_at: f.fixture.date ?? null,
      home_score: f.goals.home ?? null,
      away_score: f.goals.away ?? null,
      status: f.fixture.status?.short ?? null,
      api_football_id: f.fixture.id,
    })
  }

  for (let i = 0; i < fixturesPayload.length; i += 200) {
    const { error: fixErr } = await supabase
      .from('fixtures')
      .upsert(fixturesPayload.slice(i, i + 200), { onConflict: 'api_football_id' })
    if (fixErr) console.warn(`[sync] fixtures upsert warning: ${fixErr.message}`)
  }

  // Standings → api_cache
  const standingsJson = await apiFetch(supabase, 'standings', { league: target.apiLeagueId, season: target.season })
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  await supabase
    .from('api_cache')
    .upsert(
      { cache_key: `standings:${target.apiLeagueId}:${target.season}`, data: standingsJson, expires_at: expiresAt },
      { onConflict: 'cache_key' }
    )

  return { teams: teamsPayload.length, fixtures: fixturesPayload.length }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function runSync(): Promise<SyncResult> {
  const startedAt = new Date().toISOString()
  const supabase = makeSupabase()
  const leagueResults: SyncResult['leagues'] = []

  const sportId = await ensureFootballSport(supabase)

  for (const target of TARGETS) {
    const { teams, fixtures } = await syncLeague(supabase, sportId, target)
    leagueResults.push({ label: target.label, teams, fixtures })
    console.log(`[sync] ✓ ${target.label}: ${teams} teams, ${fixtures} fixtures`)
  }

  return { ok: true, startedAt, finishedAt: new Date().toISOString(), leagues: leagueResults }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
