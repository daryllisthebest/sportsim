'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SidebarAd } from '@/components/AdSlot'

function SimulationRunner() {
  const params = useSearchParams()
  const fixtureId = params.get('fixture')

  const [fixture, setFixture] = useState<any>(null)
  const [runs, setRuns] = useState(1000)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!fixtureId) return
    supabase
      .from('fixtures')
      .select(`
        *,
        home_team:teams!fixtures_home_team_id_fkey(id, name, logo_url),
        away_team:teams!fixtures_away_team_id_fkey(id, name, logo_url),
        league:leagues(id, name)
      `)
      .eq('id', fixtureId)
      .single()
      .then(({ data }) => setFixture(data))
  }, [fixtureId])

  async function runSimulation() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtureId: Number(fixtureId), runs }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!fixtureId) {
    return (
      <div className="text-center py-20 text-gray-500">
        No fixture selected. Go to <a href="/fixtures" className="text-blue-400 underline">Fixtures</a>.
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Run Simulation</h1>
        <p className="text-gray-400 mt-1">Monte Carlo simulation with AI narrative</p>
      </div>

      {fixture && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-4">
            {(fixture as any).league?.name}
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-right">
              <div className="font-bold text-xl text-white">{(fixture as any).home_team?.name}</div>
              <div className="text-xs text-gray-500 mt-1">Home</div>
            </div>
            <div className="text-2xl font-bold text-gray-600">vs</div>
            <div className="flex-1">
              <div className="font-bold text-xl text-white">{(fixture as any).away_team?.name}</div>
              <div className="text-xs text-gray-500 mt-1">Away</div>
            </div>
          </div>
          {(fixture as any).kickoff_at && (
            <div className="text-center text-sm text-gray-500 mt-4">
              {new Date((fixture as any).kickoff_at).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold">Simulation Settings</h2>
        <div>
          <label className="text-sm text-gray-400 block mb-2">Number of runs</label>
          <div className="flex gap-3">
            {[500, 1000, 5000, 10000].map((n) => (
              <button
                key={n}
                onClick={() => setRuns(n)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  runs === n
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={runSimulation}
          disabled={loading || !fixture}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl transition-colors"
        >
          {loading ? 'Simulating…' : `Run ${runs.toLocaleString()} Simulations`}
        </button>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      <SidebarAd />

      {loading && (
        <div className="text-center py-8 text-gray-400 animate-pulse">
          Running Monte Carlo simulation and generating AI narrative…
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-semibold mb-4">Results</h2>

            {result.result.homeRating && (
              <div className="flex justify-between text-xs text-gray-500 mb-3">
                <span>Rating: <span className="text-gray-300 font-medium">{result.result.homeRating}</span></span>
                <span className="text-gray-600">FIFA strength</span>
                <span>Rating: <span className="text-gray-300 font-medium">{result.result.awayRating}</span></span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {(result.result.homeWinProb * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400 mt-1">{result.result.homeTeam} Win</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-400">
                  {(result.result.drawProb * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400 mt-1">Draw</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400">
                  {(result.result.awayWinProb * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400 mt-1">{result.result.awayTeam} Win</div>
              </div>
            </div>

            <div className="mt-4 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-blue-600 transition-all"
                style={{ width: `${result.result.homeWinProb * 100}%` }}
              />
              <div
                className="bg-gray-600 transition-all"
                style={{ width: `${result.result.drawProb * 100}%` }}
              />
              <div
                className="bg-orange-600 transition-all"
                style={{ width: `${result.result.awayWinProb * 100}%` }}
              />
            </div>

            <div className="mt-4 text-center text-sm text-gray-400">
              Most likely scoreline:{' '}
              <span className="text-white font-semibold">{result.result.mostLikelyScore}</span>
            </div>
          </div>

          {result.narrative && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-semibold mb-3">AI Match Narrative</h2>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm">
                {result.narrative}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={runSimulation}
              className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm transition-colors"
            >
              Run Again
            </button>
            <a
              href="/simulations"
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm text-center transition-colors"
            >
              View All Simulations
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NewSimulationPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-500">Loading…</div>}>
      <SimulationRunner />
    </Suspense>
  )
}
