interface Props {
  homeTeam: string
  awayTeam: string
  homeWin: number
  awayWin: number
  draw: number
}

export function getVerdict(homeTeam: string, awayTeam: string, homeWin: number, awayWin: number, draw: number) {
  const gap = Math.abs(homeWin - awayWin)
  const favorite = homeWin > awayWin ? homeTeam : awayTeam
  const underdog = homeWin > awayWin ? awayTeam : homeTeam
  const favProb = Math.max(homeWin, awayWin)
  const underdogProb = Math.min(homeWin, awayWin)

  if (draw > 0.38 && gap < 0.12) {
    return { emoji: '⚖️', label: 'Too Close to Call', sub: 'This one could go either way — expect drama!', color: 'text-yellow-400' }
  }
  if (favProb > 0.62) {
    return { emoji: '⚡', label: `${favorite} Strong Favorite`, sub: `${underdog} will need to pull off an upset`, color: 'text-blue-400' }
  }
  if (underdogProb > 0.28 && favProb < 0.55) {
    return { emoji: '🔥', label: 'Upset Alert!', sub: `${underdog} have a real chance to shock ${favorite}`, color: 'text-orange-400' }
  }
  return { emoji: '🎯', label: `${favorite} Slight Favorite`, sub: 'A competitive match with the result in the balance', color: 'text-green-400' }
}

export default function VerdictBadge({ homeTeam, awayTeam, homeWin, awayWin, draw }: Props) {
  const verdict = getVerdict(homeTeam, awayTeam, homeWin, awayWin, draw)
  return (
    <div className="text-center py-4 border-b border-gray-800">
      <div className="text-4xl mb-2">{verdict.emoji}</div>
      <div className={`text-xl font-bold ${verdict.color}`}>{verdict.label}</div>
      <div className="text-sm text-gray-400 mt-1">{verdict.sub}</div>
    </div>
  )
}
