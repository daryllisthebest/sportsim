'use client'

import { useState } from 'react'

interface Props {
  homeTeam: string
  awayTeam: string
  homeWin: number
  awayWin: number
  draw: number
  mostLikelyScore?: string
}

export default function ShareButton({ homeTeam, awayTeam, homeWin, awayWin, draw, mostLikelyScore }: Props) {
  const [copied, setCopied] = useState(false)

  function share() {
    const text = [
      `🏆 WC 2026 Prediction: ${homeTeam} 🆚 ${awayTeam}`,
      ``,
      `📊 ${homeTeam} win: ${(homeWin * 100).toFixed(0)}%  |  Draw: ${(draw * 100).toFixed(0)}%  |  ${awayTeam} win: ${(awayWin * 100).toFixed(0)}%`,
      mostLikelyScore ? `⚽ Most likely score: ${mostLikelyScore}` : '',
      ``,
      `🔮 Simulated on sportsim.vercel.app`,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <button
      onClick={share}
      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
    >
      {copied ? '✅ Copied!' : '📤 Share Prediction'}
    </button>
  )
}
