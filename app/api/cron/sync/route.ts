import { NextRequest, NextResponse } from 'next/server'
import { runSync } from '@/lib/sync'

export const maxDuration = 60 // seconds — Vercel Pro allows up to 300

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runSync()
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[cron/sync] error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
