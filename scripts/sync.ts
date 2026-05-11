/**
 * API-Football → Supabase data sync
 *
 * Fetches fixtures, teams, and standings for:
 *   - FIFA World Cup 2026        (league 1,  season 2026)
 *   - UEFA Champions League 2024/25 (league 2,  season 2024)
 *   - English Premier League 2024/25 (league 39, season 2024)
 *
 * Run manually:  npm run sync
 * Cron (hourly): see scripts/run-sync.sh
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const API_KEY         = process.env.API_FOOTBALL_KEY!
const API_HOST        = 'v3.football.api-sports.io'

if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
  console.error('Missing required env vars. Check .env.local.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TARGETS = [
  { label: 'FIFA World Cup 2026',           apiLeagueId: 1,  season: 2026 },
  { label: 'UEFA Champions League 2024/25', apiLeagueId: 2,  season: 2024 },
  { label: 'Premier League 2024/25',        apiLeagueId: 39, season: 2024 },
]

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch(endpoint: string, params: Record<string, string | number> = {}) {
  const url = new URL(`https://${API_HOST}/${endpoint}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))

  // Check api_cache first
  const cacheKey = url.toString()
  const { data: cached } = await supabase
    .from('api_cache')
    .select('data, expires_at')
    .eq('cache_key', cacheKey)
    .single()

  if (cached && new Date(cached.expires_at) > new Date()) {
    log(`  [cache hit] ${endpoint}`)
    return cached.data
  }

  log(`  [fetch] GET /${endpoint} ${JSON.stringify(params)}`)
  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_KEY },
  })

  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)

  const remaining = res.headers.get('x-ratelimit-requests-remaining')
  if (remaining !== null) log(`  [rate limit] ${remaining} requests remaining today`)

  const json = await res.json()

  if (json.errors && Object.keys(json.errors).length) {
    throw new Error(`API error: ${JSON.stringify(json.errors)}`)
  }

  // Cache for 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  await supabase
    .from('api_cache')
    .upsert({ cache_key: cacheKey, data: json, expires_at: expiresAt }, { onConflict: 'cache_key' })

  // Respect rate limits – small delay between calls
  await sleep(250)
  return json
}

// ─── Sync functions ───────────────────────────────────────────────────────────

async function ensureFootballSport(): Promise<number> {
  const { data } = await supabase
    .from('sports')
    .select('id')
    .eq('name', 'Football')
    .single()

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
  sportId: number,
  target: (typeof TARGETS)[number]
): Promise<number> {
  log(`\n▶ League: ${target.label}`)

  // Upsert league
  const { data: leagueRow, error } = await supabase
    .from('leagues')
    .upsert(
      {
        sport_id: sportId,
        name: target.label,
        api_football_id: target.apiLeagueId,
        season: target.season,
      },
      { onConflict: 'api_football_id' }
    )
    .select('id')
    .single()

  if (error || !leagueRow) throw new Error(`League upsert failed: ${error?.message}`)
  const leagueDbId = leagueRow.id
  log(`  League DB id: ${leagueDbId}`)

  // ── Teams ────────────────────────────────────────────────────────────────
  const teamsJson = await apiFetch('teams', {
    league: target.apiLeagueId,
    season: target.season,
  })

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

    if (teamsErr) log(`  [warn] Teams upsert: ${teamsErr.message}`)
    else log(`  ✓ ${teamsPayload.length} teams upserted`)
  }

  // Build api_football_id → db id map for this league
  const { data: dbTeams } = await supabase
    .from('teams')
    .select('id, api_football_id')
    .eq('league_id', leagueDbId)

  const teamMap = new Map<number, number>()
  for (const t of dbTeams ?? []) {
    if (t.api_football_id) teamMap.set(t.api_football_id, t.id)
  }

  // ── Fixtures ─────────────────────────────────────────────────────────────
  const fixturesJson = await apiFetch('fixtures', {
    league: target.apiLeagueId,
    season: target.season,
  })

  const fixturesPayload: any[] = []
  for (const f of fixturesJson.response ?? []) {
    const homeApiId: number = f.teams.home.id
    const awayApiId: number = f.teams.away.id
    const homeDbId = teamMap.get(homeApiId)
    const awayDbId = teamMap.get(awayApiId)

    if (!homeDbId || !awayDbId) continue // skip if teams not synced yet

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

  if (fixturesPayload.length) {
    // Batch upsert in chunks of 200 to stay within Supabase limits
    for (let i = 0; i < fixturesPayload.length; i += 200) {
      const chunk = fixturesPayload.slice(i, i + 200)
      const { error: fixErr } = await supabase
        .from('fixtures')
        .upsert(chunk, { onConflict: 'api_football_id' })
      if (fixErr) log(`  [warn] Fixtures chunk ${i / 200 + 1}: ${fixErr.message}`)
    }
    log(`  ✓ ${fixturesPayload.length} fixtures upserted`)
  }

  return leagueDbId
}

async function syncStandings(leagueDbId: number, apiLeagueId: number, season: number) {
  const json = await apiFetch('standings', { league: apiLeagueId, season })
  const cacheKey = `standings:${apiLeagueId}:${season}`
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  await supabase
    .from('api_cache')
    .upsert({ cache_key: cacheKey, data: json, expires_at: expiresAt }, { onConflict: 'cache_key' })

  const groups = json.response?.[0]?.league?.standings ?? []
  log(`  ✓ Standings cached (${groups.length} group(s)/table(s))`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('='.repeat(55))
  log(`SportSim data sync  ${new Date().toISOString()}`)
  log('='.repeat(55))

  const sportId = await ensureFootballSport()
  log(`Football sport id: ${sportId}`)

  for (const target of TARGETS) {
    const leagueDbId = await syncLeague(sportId, target)
    await syncStandings(leagueDbId, target.apiLeagueId, target.season)
  }

  log('\n✅ Sync complete\n')
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function log(msg: string) {
  process.stdout.write(msg + '\n')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

main().catch((err) => {
  console.error('Sync failed:', err)
  process.exit(1)
})
