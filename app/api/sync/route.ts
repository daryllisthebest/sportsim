import { NextResponse } from 'next/server'
import { runSync } from '@/lib/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const result = await runSync()
    return NextResponse.json({
      ok: result.ok,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      leagues: result.leagues.length,
      teams: result.leagues.reduce((sum, l) => sum + l.teams, 0),
      fixtures: result.leagues.reduce((sum, l) => sum + l.fixtures, 0),
      detail: result.leagues,
    })
  } catch (err: any) {
    console.error('[api/sync] error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
