import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getTeamStrength } from '@/lib/wc2026-teams'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function runMonteCarlo(runs: number, homeStrength: number, awayStrength: number) {
  let homeWins = 0, draws = 0, awayWins = 0
  const results: Array<{ home: number; away: number }> = []

  for (let i = 0; i < runs; i++) {
    const total = homeStrength + awayStrength
    const homeExpected = (homeStrength / total) * 2.5
    const awayExpected = (awayStrength / total) * 2.5

    // Poisson-approximate using sum of uniforms
    const homeGoals = poissonSample(homeExpected)
    const awayGoals = poissonSample(awayExpected)

    if (homeGoals > awayGoals) homeWins++
    else if (homeGoals === awayGoals) draws++
    else awayWins++

    results.push({ home: homeGoals, away: awayGoals })
  }

  return {
    homeWinProb: homeWins / runs,
    drawProb: draws / runs,
    awayWinProb: awayWins / runs,
    sampleResults: results.slice(0, 10),
    mostLikelyScore: mostCommonScore(results),
  }
}

function poissonSample(lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0, p = 1
  do { k++; p *= Math.random() } while (p > L)
  return k - 1
}

function mostCommonScore(results: Array<{ home: number; away: number }>) {
  const counts: Record<string, number> = {}
  for (const r of results) {
    const key = `${r.home}-${r.away}`
    counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '0-0'
}

export async function POST(req: NextRequest) {
  // Use service role key when available so RLS never blocks reads or writes
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  try {
    const { fixtureId, runs = 1000 } = await req.json()

    console.log('[simulate] fixtureId received:', fixtureId, 'type:', typeof fixtureId)

    if (!fixtureId) return NextResponse.json({ error: 'fixtureId required' }, { status: 400 })

    const { data: fixture } = await (supabase as any)
      .from('fixtures')
      .select(`
        *,
        home_team:teams!fixtures_home_team_id_fkey(id, name),
        away_team:teams!fixtures_away_team_id_fkey(id, name),
        league:leagues(id, name)
      `)
      .eq('id', fixtureId)
      .single() as { data: AnyRecord | null }

    if (!fixture) return NextResponse.json({ error: 'Fixture not found' }, { status: 404 })

    const f = fixture as any
    const home = f.home_team
    const away = f.away_team
    const league = f.league

    const { data: homePlayers } = await (supabase as any)
      .from('players')
      .select('*')
      .eq('team_id', home.id) as { data: AnyRecord[] | null }

    const { data: awayPlayers } = await (supabase as any)
      .from('players')
      .select('*')
      .eq('team_id', away.id) as { data: AnyRecord[] | null }

    const homeAvailability = homePlayers
      ? (homePlayers as any[]).filter((p) => p.available).length / Math.max(homePlayers.length, 1)
      : 1
    const awayAvailability = awayPlayers
      ? (awayPlayers as any[]).filter((p) => p.available).length / Math.max(awayPlayers.length, 1)
      : 1

    // Use FIFA-ranking-based ratings when available, falling back to 62
    const homeRating = getTeamStrength(home.name)
    const awayRating = getTeamStrength(away.name)

    // Scale ratings to a 0–100 base; apply availability and home advantage (1.08)
    const homeStrength = homeRating * homeAvailability * 1.08
    const awayStrength = awayRating * awayAvailability

    const sim = runMonteCarlo(runs, homeStrength, awayStrength)

    const prompt = `You are a sports analyst. Provide a concise 2-3 paragraph match preview/simulation narrative.

Match: ${home.name} vs ${away.name}
League: ${league?.name ?? 'Unknown'}
${f.kickoff_at ? `Date: ${new Date(f.kickoff_at).toLocaleDateString()}` : ''}

Team ratings (FIFA ranking-based, out of 100):
- ${home.name}: ${homeRating} (home advantage applied)
- ${away.name}: ${awayRating}

Monte Carlo Simulation (${runs.toLocaleString()} runs):
- ${home.name} win probability: ${(sim.homeWinProb * 100).toFixed(1)}%
- Draw probability: ${(sim.drawProb * 100).toFixed(1)}%
- ${away.name} win probability: ${(sim.awayWinProb * 100).toFixed(1)}%
- Most likely scoreline: ${sim.mostLikelyScore}

${homePlayers?.length ? `${home.name} squad size: ${homePlayers.length} (${Math.round(homeAvailability * 100)}% available)` : ''}
${awayPlayers?.length ? `${away.name} squad size: ${awayPlayers.length} (${Math.round(awayAvailability * 100)}% available)` : ''}

Write an engaging narrative about what this simulation predicts for the match. Mention team strengths, the key probabilities, and what factors could influence the outcome. Keep it factual and analytical.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const narrative = message.content[0].type === 'text' ? message.content[0].text : ''

    const resultJson = {
      homeWinProb: sim.homeWinProb,
      drawProb: sim.drawProb,
      awayWinProb: sim.awayWinProb,
      mostLikelyScore: sim.mostLikelyScore,
      runs,
      homeTeam: home.name,
      awayTeam: away.name,
      homeRating,
      awayRating,
    }

    console.log('[simulate] Attempting simulations insert for fixtureId:', fixtureId)
    const { data: savedSim, error: saveError } = await (supabase as any)
      .from('simulations')
      .insert({ fixture_id: fixtureId, result_json: resultJson as AnyRecord, narrative } as AnyRecord)
      .select()
      .single() as { data: AnyRecord | null; error: { message: string } | null }

    console.log('[simulate] savedSim:', JSON.stringify(savedSim))
    console.log('[simulate] saveError:', saveError ? JSON.stringify(saveError) : null)

    if (saveError) {
      console.error('[simulate] Failed to save simulation:', saveError.message)
    }

    if (savedSim) {
      console.log('[simulate] Inserting simulation_runs for simulation_id:', savedSim.id)
      const { error: runError } = await (supabase as any)
        .from('simulation_runs')
        .insert({
          simulation_id: savedSim.id,
          runs,
          home_win_prob: sim.homeWinProb,
          draw_prob: sim.drawProb,
          away_win_prob: sim.awayWinProb,
        } as AnyRecord) as { error: { message: string } | null }
      if (runError) {
        console.error('[simulate] Failed to save simulation_runs:', JSON.stringify(runError))
      } else {
        console.log('[simulate] simulation_runs saved successfully')
      }
    } else {
      console.warn('[simulate] Skipping simulation_runs insert — savedSim is null')
    }

    return NextResponse.json({ simulation: savedSim, result: resultJson, narrative })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 })
  }
}
