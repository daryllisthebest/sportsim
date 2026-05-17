import { createServerClient } from '@/lib/supabase'
import Link from 'next/link'
import { LeaderboardAd } from '@/components/AdSlot'

export const dynamic = 'force-dynamic'

async function getSimulations() {
  const { data, error } = await (createServerClient() as any)
    .from('simulations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) console.error('[simulations] query error:', JSON.stringify(error))
  console.log('[simulations] count:', data?.length ?? 0)
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
          const result = sim.result_json

          const homeWin = result?.homeWinProb ?? 0
          const draw = result?.drawProb ?? 0
          const awayWin = result?.awayWinProb ?? 0

          return (
            <div
              key={sim.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">
                    {result?.homeTeam ?? 'Home'} vs {result?.awayTeam ?? 'Away'}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>{new Date(sim.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                  {result?.runs && (
                    <div className="mt-1">{result.runs.toLocaleString()} runs</div>
                  )}
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

              <div className="flex items-center justify-between">
                {result?.mostLikelyScore && (
                  <div className="text-sm text-gray-400">
                    Most likely score:{' '}
                    <span className="text-white font-medium">{result.mostLikelyScore}</span>
                  </div>
                )}
                <Link
                  href={`/simulations/${sim.id}`}
                  className="ml-auto text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  View full narrative →
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
