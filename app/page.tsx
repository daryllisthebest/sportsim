import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [{ data: sports }, { data: leagues }, { data: fixtures }, { data: simulations }] =
    await Promise.all([
      supabase.from('sports').select('*').order('name'),
      supabase.from('leagues').select('*, sports(name)').order('name'),
      supabase.from('fixtures').select('*').gte('kickoff_at', new Date().toISOString()).order('kickoff_at').limit(5),
      supabase.from('simulations').select('id'),
    ])
  return {
    sports: (sports ?? []) as any[],
    leagues: (leagues ?? []) as any[],
    fixtures: (fixtures ?? []) as any[],
    simCount: simulations?.length ?? 0,
  }
}

export default async function DashboardPage() {
  const { sports, leagues, fixtures, simCount } = await getData()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1">Sports simulation powered by AI</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Sports', value: sports.length },
          { label: 'Leagues', value: leagues.length },
          { label: 'Upcoming Fixtures', value: fixtures.length },
          { label: 'Simulations Run', value: simCount },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-3xl font-bold text-white">{value}</div>
            <div className="text-sm text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Sports & Leagues</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sports.map((sport) => {
            const sportLeagues = leagues.filter((l) => l.sport_id === sport.id)
            return (
              <div key={sport.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  {sport.icon && <span className="text-2xl">{sport.icon}</span>}
                  <h3 className="font-semibold text-white">{sport.name}</h3>
                </div>
                {sportLeagues.length > 0 ? (
                  <ul className="space-y-1">
                    {sportLeagues.map((league: any) => (
                      <li key={league.id} className="text-sm text-gray-400">
                        {league.name}
                        {league.season && (
                          <span className="ml-1 text-gray-600">({league.season})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600">No leagues yet</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {fixtures.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upcoming Fixtures</h2>
            <Link href="/fixtures" className="text-sm text-blue-400 hover:text-blue-300">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {fixtures.map((f) => (
              <div
                key={f.id}
                className="bg-gray-900 border border-gray-800 rounded-lg px-5 py-3 flex items-center justify-between"
              >
                <span className="text-sm text-gray-300">Fixture #{f.id}</span>
                {f.kickoff_at && (
                  <span className="text-sm text-gray-500">
                    {new Date(f.kickoff_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
