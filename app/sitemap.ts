import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const BASE = 'https://sportsim.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/wc2026`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/fixtures`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/simulations`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseUrl.startsWith('http')) return staticPages

  try {
    const supabase = createClient(supabaseUrl, supabaseKey ?? '')
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select('id, kickoff_at')
      .order('kickoff_at', { ascending: false })

    const fixturePages: MetadataRoute.Sitemap = (fixtures ?? []).map((f: any) => ({
      url: `${BASE}/fixtures/${f.id}`,
      lastModified: f.kickoff_at ? new Date(f.kickoff_at) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }))

    return [...staticPages, ...fixturePages]
  } catch {
    return staticPages
  }
}
