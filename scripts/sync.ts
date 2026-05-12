/**
 * CLI entry point for the data sync.
 *
 * Run manually:  npm run sync
 * Vercel cron:   app/api/cron/sync/route.ts (automatic, hourly)
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { runSync } from '../lib/sync'

runSync()
  .then((result) => {
    console.log('\n✅ Sync complete')
    console.log(`   Started:  ${result.startedAt}`)
    console.log(`   Finished: ${result.finishedAt}`)
    for (const l of result.leagues) {
      console.log(`   ${l.label}: ${l.teams} teams, ${l.fixtures} fixtures`)
    }
    process.exit(0)
  })
  .catch((err) => {
    console.error('Sync failed:', err)
    process.exit(1)
  })
