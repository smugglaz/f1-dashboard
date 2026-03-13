import { useApiQuery } from '@/hooks/useApiQuery'
import { getTeamColor, getTeamName } from '../utils/teams'
import LoadingSpinner from './LoadingSpinner'

function Stat({ label, value, highlight = false }) {
  return (
    <div className="bg-glass-border/50 rounded px-2.5 py-1.5 text-center min-w-[70px]">
      <div className="text-[10px] text-label-tertiary uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-mono font-bold ${highlight ? 'text-yellow-400' : ''}`}>
        {value ?? '-'}
      </div>
    </div>
  )
}

export default function DriverStatsCard({ year, driverId }) {
  const { data, loading } = useApiQuery(
    driverId ? `/api/historical/driver-stats/${year}/${driverId}` : null
  )

  if (!driverId) return null
  if (loading) return <LoadingSpinner />
  if (!data?.stats) return <p className="text-sm text-label-tertiary text-center py-2">No data</p>

  const s = data.stats
  const teamColor = getTeamColor(getTeamName(data))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-6 rounded" style={{ backgroundColor: teamColor }} />
        <span className="font-semibold text-sm">{data.driver.code}</span>
        <span className="text-label-tertiary text-sm">{data.driver.name}</span>
        <span className="text-xs text-label-tertiary ml-auto">{getTeamName(data)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Race Performance */}
        <div>
          <h4 className="text-[10px] text-label-tertiary uppercase tracking-wider mb-1.5">Race Results</h4>
          <div className="flex flex-wrap gap-1.5">
            <Stat label="Wins" value={s.wins} highlight={s.wins > 0} />
            <Stat label="Podiums" value={s.podiums} />
            <Stat label="Top 10" value={s.points_finishes} />
            <Stat label="DNFs" value={s.dnfs} />
            <Stat label="FL" value={s.fastest_laps} highlight={s.fastest_laps > 0} />
          </div>
        </div>

        {/* Pace */}
        <div>
          <h4 className="text-[10px] text-label-tertiary uppercase tracking-wider mb-1.5">Pace</h4>
          <div className="flex flex-wrap gap-1.5">
            <Stat label="Avg Grid" value={s.avg_grid} />
            <Stat label="Avg Finish" value={s.avg_finish} />
            <Stat label="Best" value={s.best_finish ? `P${s.best_finish}` : '-'} />
            <Stat label="Worst" value={s.worst_finish ? `P${s.worst_finish}` : '-'} />
          </div>
        </div>

        {/* Qualifying */}
        <div>
          <h4 className="text-[10px] text-label-tertiary uppercase tracking-wider mb-1.5">Qualifying</h4>
          <div className="flex flex-wrap gap-1.5">
            <Stat label="Poles" value={s.poles} highlight={s.poles > 0} />
            <Stat label="Avg Pos" value={s.avg_qualifying} />
          </div>
        </div>

        {/* Points */}
        <div>
          <h4 className="text-[10px] text-label-tertiary uppercase tracking-wider mb-1.5">Points</h4>
          <div className="flex flex-wrap gap-1.5">
            <Stat label="Total" value={s.total_points} highlight />
            <Stat label="Per Race" value={s.points_per_race} />
            <Stat label="Races" value={s.races} />
          </div>
        </div>
      </div>
    </div>
  )
}
