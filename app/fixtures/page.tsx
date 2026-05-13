import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getFixtures() {
  const { data } = await supabase
    .from('fixtures')
    .select(`
      *,
      home_team:teams!fixtures_home_team_id_fkey(id, name, logo_url),
      away_team:teams!fixtures_away_team_id_fkey(id, name, logo_url),
      league:leagues(id, name)
    `)
    .order('kickoff_at', { ascending: true })
  return data ?? []
}

function statusBadge(status: string | null) {
  const map: Record<string, string> = {
    NS: 'bg-gray-700 text-gray-300',
    FT: 'bg-green-900 text-green-300',
    LIVE: 'bg-red-900 text-red-300',
    PST: 'bg-yellow-900 text-yellow-300',
  }
  const cls = map[status ?? 'NS'] ?? 'bg-gray-700 text-gray-300'
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {status ?? 'NS'}
    </span>
  )
}

export default async function FixturesPage() {
  const fixtures = (await getFixtures()) as any[]

  const grouped: Record<string, any[]> = {}
  for (const f of fixtures) {
    const key = f.league?.name ?? 'Unknown League'
    grouped[key] = grouped[key] ?? []
    grouped[key].push(f)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Fixtures</h1>
        <p className="text-gray-400 mt-1">{fixtures.length} matches found</p>
      </div>

      {fixtures.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          No fixtures in the database yet. Add teams and fixtures via Supabase.
        </div>
      )}

      {Object.entries(grouped).map(([leagueName, leagueFixtures]) => (
        <div key={leagueName}>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">{leagueName}</h2>
          <div className="space-y-2">
            {leagueFixtures.map((f) => {
              const home = f.home_team
              const away = f.away_team
              const hasResult = f.home_score !== null && f.away_score !== null
              return (
                <div
                  key={f.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center gap-3 justify-end">
                      {home?.logo_url && (
                        <img src={home.logo_url} alt={home?.name} className="w-6 h-6 object-contain" />
                      )}
                      <span className="font-medium text-white text-right">{home?.name ?? 'TBD'}</span>
                    </div>

                    <div className="flex flex-col items-center min-w-[80px]">
                      {hasResult ? (
                        <span className="text-xl font-bold text-white">
                          {f.home_score} – {f.away_score}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">vs</span>
                      )}
                      <div className="mt-1">{statusBadge(f.status)}</div>
                    </div>

                    <div className="flex-1 flex items-center gap-3">
                      {away?.logo_url && (
                        <img src={away.logo_url} alt={away?.name} className="w-6 h-6 object-contain" />
                      )}
                      <span className="font-medium text-white">{away?.name ?? 'TBD'}</span>
                    </div>

                    <div className="ml-4 flex flex-col items-end gap-1">
                      {f.kickoff_at && (
                        <span className="text-xs text-gray-500">
                          {new Date(f.kickoff_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                      <Link
                        href={`/simulations/new?fixture=${f.id}`}
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-full transition-colors"
                      >
                        Simulate →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
