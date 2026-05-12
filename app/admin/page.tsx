'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function triggerSync() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/cron/sync', {
        headers: { Authorization: `Bearer ${secret}` },
      })
      const data = await res.json()
      setResult({ status: res.status, data })
    } catch (e: any) {
      setResult({ status: 'network error', data: { error: e.message } })
    } finally {
      setLoading(false)
    }
  }

  async function checkStatus() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/status')
      const data = await res.json()
      setResult({ status: res.status, data })
    } catch (e: any) {
      setResult({ status: 'network error', data: { error: e.message } })
    } finally {
      setLoading(false)
    }
  }

  const ok = result?.status === 200

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-gray-400 mt-1">Database diagnostics &amp; manual sync</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold">Database Status</h2>
        <button
          onClick={checkStatus}
          disabled={loading}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
        >
          {loading ? 'Checking…' : 'Check Tables'}
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold">Manual Sync</h2>
        <div>
          <label className="text-sm text-gray-400 block mb-1">CRON_SECRET</label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter your CRON_SECRET"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={triggerSync}
          disabled={loading || !secret}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          {loading ? 'Running sync…' : 'Run Sync Now'}
        </button>
        <p className="text-xs text-gray-500">
          This fetches World Cup 2026, UCL, and EPL data from API-Football and stores it in Supabase. Takes ~30s.
        </p>
      </div>

      {result && (
        <div className={`border rounded-xl p-5 space-y-2 ${ok ? 'bg-green-950/40 border-green-800' : 'bg-red-950/40 border-red-800'}`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${ok ? 'text-green-400' : 'text-red-400'}`}>
              HTTP {result.status}
            </span>
          </div>
          <pre className="text-xs text-gray-300 overflow-auto whitespace-pre-wrap break-words">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
