import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { LeaderboardAd } from '@/components/AdSlot'

export const dynamic = 'force-dynamic'

async function getSimulations() {
  const { data } = await supabase
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
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as any[]
}

export default async function SimulationsPage() {
  const simulations = await getSimulations()

  return (
    <div className="space-y-8">
      <LeaderboardAd />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Simulations</h1>
          <p className="text-gray-400 mt-1">History of all simulation runs</p>
        </div>
        <Link
          href="/fixtures"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          New Simulation
        </Link>
      </div>

      {simulations.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          No simulations yet.{' '}
          <Link href="/fixtures" className="text-blue-400 underline">
            Pick a fixture
          </Link>{' '}
          to run your first simulation.
        </div>
      )}

      <div className="space-y-4">
        {simulations.map((sim) => {
          const fixture = sim.fixture
          const result = sim.result_json
          const run = sim.simulation_runs?.[0]

          const homeWin = result?.homeWinProb ?? run?.home_win_prob ?? 0
          const draw = result?.drawProb ?? run?.draw_prob ?? 0
          const awayWin = result?.awayWinProb ?? run?.away_win_prob ?? 0

          return (
            <div
              key={sim.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    {fixture?.league?.name}
                  </div>
                  <div className="font-semibold text-white">
                    {fixture?.home_team?.name ?? 'Home'} vs {fixture?.away_team?.name ?? 'Away'}
                  </div>
                  {fixture?.kickoff_at && (
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(fixture.kickoff_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>{new Date(sim.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                  {run && <div className="mt-1">{run.runs?.toLocaleString()} runs</div>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-950/50 border border-blue-900/50 rounded-lg py-3">
                  <div className="text-lg font-bold text-blue-400">{(homeWin * 100).toFixed(1)}%</div>
                  <div className="text-xs text-gray-400 mt-0.5">Home Win</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg py-3">
                  <div className="text-lg font-bold text-gray-300">{(draw * 100).toFixed(1)}%</div>
                  <div className="text-xs text-gray-400 mt-0.5">Draw</div>
                </div>
                <div className="bg-orange-950/50 border border-orange-900/50 rounded-lg py-3">
                  <div className="text-lg font-bold text-orange-400">{(awayWin * 100).toFixed(1)}%</div>
                  <div className="text-xs text-gray-400 mt-0.5">Away Win</div>
                </div>
              </div>

              {result?.mostLikelyScore && (
                <div className="text-sm text-gray-400">
                  Most likely score: <span className="text-white font-medium">{result.mostLikelyScore}</span>
                </div>
              )}

              {sim.narrative && (
                <details className="group">
                  <summary className="text-sm text-blue-400 cursor-pointer hover:text-blue-300">
                    View AI narrative ↓
                  </summary>
                  <p className="mt-3 text-sm text-gray-300 leading-relaxed whitespace-pre-line border-t border-gray-800 pt-3">
                    {sim.narrative}
                  </p>
                </details>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
