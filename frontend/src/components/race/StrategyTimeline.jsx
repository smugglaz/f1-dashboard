import { useApi } from '@/hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TyreBadge } from '@/components/ui/tyre-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getTireColor } from '@/utils/colors'
import { getTeamColor } from '@/utils/teams'
import { Layers } from 'lucide-react'

export default function StrategyTimeline({ year, round }) {
  const { data, loading } = useApi(
    year && round ? `/api/historical/stints/${year}/${round}` : null
  )

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Strategy</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-6 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  if (!data?.drivers?.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-4 w-4" />Strategy</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-label-tertiary text-center py-4">
            No stint data available. Stint data is only available for 2018+ races synced via FastF1.
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalLaps = data.total_laps || 1

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-label-tertiary" />
            Strategy Timeline
          </CardTitle>
          <span className="text-xs text-label-tertiary">{totalLaps} laps</span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex gap-3 mb-3 text-xs">
          {['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'].map(c => (
            <div key={c} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getTireColor(c) }} />
              <span className="text-label-tertiary">{c[0]}</span>
            </div>
          ))}
        </div>

        {/* Driver bars */}
        <div className="space-y-1">
          {data.drivers.map((driver) => {
            const teamColor = getTeamColor(driver.constructor || '')
            return (
              <div key={driver.code} className="flex items-center gap-2">
                {/* Driver code + position */}
                <div className="w-16 flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-label-tertiary font-mono w-5 text-right">
                    P{driver.position || '?'}
                  </span>
                  <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: teamColor }} />
                  <span className="text-xs font-mono font-bold">{driver.code}</span>
                </div>

                {/* Stint bars */}
                <div className="flex-1 h-5 flex rounded-sm overflow-hidden">
                  {driver.stints.map((stint, i) => {
                    const start = (stint.lap_start || 1) - 1
                    const end = stint.lap_end || totalLaps
                    const width = ((end - start) / totalLaps) * 100
                    const color = getTireColor(stint.compound)

                    return (
                      <div
                        key={i}
                        className="h-full relative group"
                        style={{ width: `${width}%`, backgroundColor: color, opacity: stint.fresh ? 1 : 0.7 }}
                        title={`${stint.compound || '?'} L${stint.lap_start}-${stint.lap_end}${stint.fresh ? ' (New)' : ' (Used)'}`}
                      >
                        {/* Pit stop divider */}
                        {i > 0 && (
                          <div className="absolute left-0 top-0 bottom-0 w-px bg-white" />
                        )}
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                          <div className="bg-white border border-glass-border rounded px-2 py-1 text-[10px] whitespace-nowrap shadow-sm">
                            <span className="font-bold">{stint.compound}</span>
                            {' '}L{stint.lap_start}–{stint.lap_end}
                            {!stint.fresh && ' (used)'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Lap scale */}
        <div className="flex justify-between text-[10px] text-label-tertiary mt-1 ml-[4.5rem]">
          <span>Lap 1</span>
          <span>Lap {Math.round(totalLaps / 2)}</span>
          <span>Lap {totalLaps}</span>
        </div>
      </CardContent>
    </Card>
  )
}
