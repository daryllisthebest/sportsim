import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getSim(id: string) {
  const { data } = await createServerClient()
    .from('simulations')
    .select(`
      *,
      fixture:fixtures(
        id, kickoff_at,
        home_team:teams!fixtures_home_team_id_fkey(name),
        away_team:teams!fixtures_away_team_id_fkey(name),
        league:leagues(name)
      ),
      simulation_runs(runs, home_win_prob, draw_prob, away_win_prob)
    `)
    .eq('id', Number(id))
    .single()
  return data as any
}

export default async function SimulationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sim = await getSim(id)

  if (!sim) notFound()

  const fixture = sim.fixture
  const result = sim.result_json
  const run = sim.simulation_runs?.[0]

  const homeWin = result?.homeWinProb ?? run?.home_win_prob ?? 0
  const draw = result?.drawProb ?? run?.draw_prob ?? 0
  const awayWin = result?.awayWinProb ?? run?.away_win_prob ?? 0
  const runs = result?.runs ?? run?.runs

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/simulations" className="text-sm text-gray-400 hover:text-gray-200 inline-block">
        ← All simulations
      </Link>

      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
          {fixture?.league?.name}
        </div>
        <h1 className="text-2xl font-bold text-white">
          {fixture?.home_team?.name ?? 'Home'} vs {fixture?.away_team?.name ?? 'Away'}
        </h1>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
          {fixture?.kickoff_at && (
            <span>Match: {new Date(fixture.kickoff_at).toLocaleDateString()}</span>
          )}
          <span>
            Simulated:{' '}
            {new Date(sim.created_at).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
          {runs && <span>{runs.toLocaleString()} Monte Carlo runs</span>}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold">Predicted Outcome</h2>

        {result?.homeRating && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              {result.homeTeam}:{' '}
              <span className="text-gray-300 font-medium">rating {result.homeRating}</span>
            </span>
            <span>
              {result.awayTeam}:{' '}
              <span className="text-gray-300 font-medium">rating {result.awayRating}</span>
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-blue-950/50 border border-blue-900/50 rounded-lg py-4">
            <div className="text-2xl font-bold text-blue-400">{(homeWin * 100).toFixed(1)}%</div>
            <div className="text-xs text-gray-400 mt-1">{result?.homeTeam ?? 'Home'} Win</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg py-4">
            <div className="text-2xl font-bold text-gray-300">{(draw * 100).toFixed(1)}%</div>
            <div className="text-xs text-gray-400 mt-1">Draw</div>
          </div>
          <div className="bg-orange-950/50 border border-orange-900/50 rounded-lg py-4">
            <div className="text-2xl font-bold text-orange-400">{(awayWin * 100).toFixed(1)}%</div>
            <div className="text-xs text-gray-400 mt-1">{result?.awayTeam ?? 'Away'} Win</div>
          </div>
        </div>

        <div className="h-3 rounded-full overflow-hidden flex">
          <div className="bg-blue-600" style={{ width: `${homeWin * 100}%` }} />
          <div className="bg-gray-600" style={{ width: `${draw * 100}%` }} />
          <div className="bg-orange-600" style={{ width: `${awayWin * 100}%` }} />
        </div>

        {result?.mostLikelyScore && (
          <div className="text-center text-sm text-gray-400">
            Most likely scoreline:{' '}
            <span className="text-white font-semibold">{result.mostLikelyScore}</span>
          </div>
        )}
      </div>

      {sim.narrative && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4">AI Match Narrative</h2>
          <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">
            {sim.narrative}
          </p>
        </div>
      )}

      {fixture?.id && (
        <Link
          href={`/simulations/new?fixture=${fixture.id}`}
          className="block text-center py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Run simulation again →
        </Link>
      )}
    </div>
  )
}
