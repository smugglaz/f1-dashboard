import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { getTireColor } from '@/utils/colors'
import { getTeamColor, getTeamName } from '@/utils/teams'

/**
 * Strategy section — shows stint timeline inline (no wrapping existing component
 * since we want it without Card chrome, directly in the narrative flow).
 */
export default function StrategySection({ stints }) {
  if (!stints?.drivers?.length) {
    return (
      <section id="strategy" className="scroll-mt-8 space-y-4">
        <h2 className="text-title-1 font-semibold">The Strategy</h2>
        <p className="text-footnote text-label-tertiary">
          Stint data is only available for 2018+ races synced via FastF1.
        </p>
      </section>
    )
  }

  const totalLaps = stints.total_laps || 1

  // Generate strategy summary
  const summary = useMemo(() => {
    const drivers = stints.drivers || []
    const stopCounts = {}
    drivers.forEach(d => {
      const stops = (d.stints?.length || 1) - 1
      stopCounts[stops] = (stopCounts[stops] || 0) + 1
    })
    const mostCommon = Object.entries(stopCounts).sort((a, b) => b[1] - a[1])[0]
    const compoundsUsed = new Set()
    drivers.forEach(d => d.stints?.forEach(s => {
      if (s.compound) compoundsUsed.add(s.compound.toUpperCase())
    }))
    const compoundStr = [...compoundsUsed].join('-')
    if (mostCommon) {
      return `Most drivers opted for a ${mostCommon[0]}-stop strategy${compoundStr ? ` using ${compoundStr} compounds` : ''}.`
    }
    return null
  }, [stints])

  return (
    <section id="strategy" className="scroll-mt-8 space-y-4">
      <div>
        <h2 className="text-title-1 font-semibold">The Strategy</h2>
        {summary && (
          <p className="text-footnote text-label-secondary mt-1">{summary}</p>
        )}
      </div>

      <Card>
        <CardContent className="p-5">
          {/* Legend */}
          <div className="flex gap-4 mb-4 text-caption-2">
            {['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'].map(c => (
              <div key={c} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getTireColor(c) }} />
                <span className="text-label-tertiary">{c[0] + c.slice(1).toLowerCase()}</span>
              </div>
            ))}
          </div>

          {/* Driver stint bars */}
          <div className="space-y-1">
            {stints.drivers.map((driver) => {
              const teamColor = getTeamColor(getTeamName(driver))
              return (
                <div key={driver.code} className="flex items-center gap-2">
                  <div className="w-16 flex items-center gap-1 shrink-0">
                    <span className="text-caption-2 text-label-tertiary font-mono w-5 text-right">
                      P{driver.position || '?'}
                    </span>
                    <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: teamColor }} />
                    <span className="text-xs font-mono font-bold">{driver.code}</span>
                  </div>

                  <div className="flex-1 h-6 flex rounded-lg overflow-hidden">
                    {driver.stints.map((stint, i) => {
                      const start = (stint.lap_start || 1) - 1
                      const end = stint.lap_end || totalLaps
                      const width = ((end - start) / totalLaps) * 100
                      const color = getTireColor(stint.compound)

                      return (
                        <div
                          key={i}
                          className="h-full relative group cursor-default"
                          style={{ width: `${width}%`, backgroundColor: color, opacity: stint.fresh ? 1 : 0.65 }}
                          title={`${stint.compound || '?'} L${stint.lap_start}-${stint.lap_end}${stint.fresh ? '' : ' (used)'}`}
                        >
                          {i > 0 && <div className="absolute left-0 top-0 bottom-0 w-px bg-white/80" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Lap scale */}
          <div className="flex justify-between text-caption-2 text-label-quaternary mt-2 ml-[4.5rem]">
            <span>Lap 1</span>
            <span>Lap {Math.round(totalLaps / 2)}</span>
            <span>Lap {totalLaps}</span>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
