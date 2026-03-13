import { useApi } from '../hooks/useApi'
import { getTeamColor } from '../utils/teams'
import LoadingSpinner from './LoadingSpinner'

function H2HBar({ leftVal, rightVal, leftCode, rightCode, label }) {
  const total = leftVal + rightVal
  const leftPct = total > 0 ? (leftVal / total) * 100 : 50
  return (
    <div className="mb-2">
      <div className="text-[10px] text-f1-muted uppercase tracking-wider mb-0.5 text-center">{label}</div>
      <div className="flex items-center gap-1.5 text-xs font-mono">
        <span className={`w-8 text-right ${leftVal > rightVal ? 'text-green-400 font-bold' : 'text-f1-muted'}`}>
          {leftVal}
        </span>
        <div className="flex-1 h-4 bg-f1-dark rounded-sm overflow-hidden flex">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${leftPct}%`, backgroundColor: leftVal >= rightVal ? '#4ade80' : '#ef4444', opacity: 0.7 }}
          />
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${100 - leftPct}%`, backgroundColor: rightVal > leftVal ? '#4ade80' : '#ef4444', opacity: 0.7 }}
          />
        </div>
        <span className={`w-8 ${rightVal > leftVal ? 'text-green-400 font-bold' : 'text-f1-muted'}`}>
          {rightVal}
        </span>
      </div>
    </div>
  )
}

function StatRow({ leftVal, rightVal, label, format = v => v, lowerBetter = false }) {
  const leftWins = lowerBetter ? leftVal < rightVal : leftVal > rightVal
  const rightWins = lowerBetter ? rightVal < leftVal : rightVal > leftVal
  return (
    <div className="flex items-center text-xs py-0.5">
      <span className={`w-16 text-right font-mono ${leftWins ? 'text-green-400 font-bold' : 'text-f1-muted'}`}>
        {leftVal != null ? format(leftVal) : '-'}
      </span>
      <span className="flex-1 text-center text-[10px] text-f1-muted uppercase">{label}</span>
      <span className={`w-16 font-mono ${rightWins ? 'text-green-400 font-bold' : 'text-f1-muted'}`}>
        {rightVal != null ? format(rightVal) : '-'}
      </span>
    </div>
  )
}

function TeamCard({ comparison }) {
  const { constructor, drivers, total_qualifying_rounds, total_race_rounds } = comparison
  if (drivers.length < 2) return null
  const [d1, d2] = drivers
  const teamColor = getTeamColor(constructor)
  const pointsDiff = Math.abs(d1.points - d2.points)
  const pointsPct = d1.points > 0 && d2.points > 0
    ? ((Math.max(d1.points, d2.points) / Math.min(d1.points, d2.points) - 1) * 100).toFixed(0)
    : null

  return (
    <div className="bg-f1-card rounded-lg border border-f1-border overflow-hidden">
      <div className="h-1" style={{ backgroundColor: teamColor }} />
      <div className="p-3">
        <h3 className="text-sm font-semibold mb-2 text-center" style={{ color: teamColor }}>{constructor}</h3>
        {/* Driver code headers */}
        <div className="flex items-center text-sm font-bold mb-2">
          <span className="w-16 text-right">{d1.code}</span>
          <span className="flex-1 text-center text-[10px] text-f1-muted">vs</span>
          <span className="w-16">{d2.code}</span>
        </div>
        <H2HBar leftVal={d1.qualifying_wins} rightVal={d2.qualifying_wins} label={`Qualifying (${total_qualifying_rounds} rounds)`} />
        <H2HBar leftVal={d1.race_wins} rightVal={d2.race_wins} label={`Race (${total_race_rounds} rounds)`} />
        <div className="border-t border-f1-border mt-2 pt-2">
          <StatRow leftVal={d1.points} rightVal={d2.points} label="Points" />
          {pointsPct && (
            <div className="text-[10px] text-f1-muted text-center">Gap: {pointsDiff} pts ({pointsPct}%)</div>
          )}
          <StatRow leftVal={d1.avg_finish} rightVal={d2.avg_finish} label="Avg Finish" format={v => v.toFixed(1)} lowerBetter />
          <StatRow leftVal={d1.avg_grid} rightVal={d2.avg_grid} label="Avg Grid" format={v => v.toFixed(1)} lowerBetter />
        </div>
      </div>
    </div>
  )
}

export default function TeammateComparison({ year }) {
  const { data, loading } = useApi(
    year ? `/api/historical/teammates/${year}` : null
  )

  if (loading) return <LoadingSpinner />
  if (!data?.comparisons?.length) {
    return <p className="text-sm text-f1-muted text-center py-4">No teammate data available</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {data.comparisons.map((c, i) => (
        <TeamCard key={i} comparison={c} />
      ))}
    </div>
  )
}
