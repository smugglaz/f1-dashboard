import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { getTeamColor } from '@/utils/teams'
import WinnerInsight from './WinnerInsight'

export default function WinningPackageSection({ summary, sectors, tyrePerf, pitStops, stints }) {
  if (!summary?.winner) return null

  const { winner, second, fastest_lap } = summary

  // Sector comparison: winner vs P2
  const sectorComparison = useMemo(() => {
    if (!sectors?.drivers?.length || !second) return null
    const winnerSectors = sectors.drivers.find(d => d.code === winner.code)
    const secondSectors = sectors.drivers.find(d => d.code === second.code)
    if (!winnerSectors || !secondSectors) return null

    return {
      winner: winnerSectors,
      second: secondSectors,
      deltas: {
        s1: (winnerSectors.best_s1_ms || 0) - (secondSectors.best_s1_ms || 0),
        s2: (winnerSectors.best_s2_ms || 0) - (secondSectors.best_s2_ms || 0),
        s3: (winnerSectors.best_s3_ms || 0) - (secondSectors.best_s3_ms || 0),
      }
    }
  }, [sectors, winner, second])

  // Pit stop comparison
  const pitComparison = useMemo(() => {
    if (!pitStops?.pit_stops?.length) return null
    const winnerStops = pitStops.pit_stops.filter(p => p.driver_code === winner.code)
    const secondStops = second ? pitStops.pit_stops.filter(p => p.driver_code === second.code) : []

    const avgDuration = (stops) => {
      const durations = stops.map(s => parseFloat(s.duration)).filter(d => !isNaN(d) && d > 0)
      return durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null
    }

    return {
      winner: { stops: winnerStops.length, avgTime: avgDuration(winnerStops) },
      second: second ? { stops: secondStops.length, avgTime: avgDuration(secondStops) } : null,
    }
  }, [pitStops, winner, second])

  const winnerTeamColor = getTeamColor(winner.constructor || '')
  const secondTeamColor = second ? getTeamColor(second.constructor || '') : '#888'

  return (
    <section id="package" className="scroll-mt-8 space-y-6">
      <div>
        <h2 className="text-title-1 font-semibold">The Winning Package</h2>
        <p className="text-footnote text-label-secondary mt-1">
          Why {winner.code} won — pace, strategy, and execution.
        </p>
      </div>

      {/* Winner insight narrative */}
      <Card>
        <CardContent className="p-5">
          <WinnerInsight summary={summary} stints={stints} sectors={sectors} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sector pace comparison */}
        {sectorComparison && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="text-caption-2 uppercase tracking-wider text-label-tertiary">
                Pace — {winner.code} vs {second.code}
              </p>
              {['s1', 's2', 's3'].map((sector, i) => {
                const delta = sectorComparison.deltas[sector]
                const faster = delta < 0
                return (
                  <div key={sector} className="space-y-1">
                    <div className="flex justify-between text-caption-1">
                      <span className="text-label-secondary">Sector {i + 1}</span>
                      <span className={`font-mono font-semibold ${faster ? 'text-emerald-600' : 'text-red-500'}`}>
                        {faster ? '' : '+'}{(delta / 1000).toFixed(3)}s
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(10, 50 + (delta / 10)))}%`,
                          backgroundColor: faster ? '#34C759' : winnerTeamColor,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Pit stop execution */}
        {pitComparison && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="text-caption-2 uppercase tracking-wider text-label-tertiary">Pit Execution</p>

              <div className="space-y-3">
                {/* Winner pit stats */}
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: winnerTeamColor }} />
                  <div>
                    <span className="text-xs font-bold font-mono">{winner.code}</span>
                    <div className="text-caption-1 text-label-secondary">
                      {pitComparison.winner.stops} stop{pitComparison.winner.stops !== 1 ? 's' : ''}
                      {pitComparison.winner.avgTime && (
                        <> — avg {pitComparison.winner.avgTime.toFixed(1)}s</>
                      )}
                    </div>
                  </div>
                </div>

                {/* P2 pit stats */}
                {pitComparison.second && second && (
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full" style={{ backgroundColor: secondTeamColor }} />
                    <div>
                      <span className="text-xs font-bold font-mono">{second.code}</span>
                      <div className="text-caption-1 text-label-secondary">
                        {pitComparison.second.stops} stop{pitComparison.second.stops !== 1 ? 's' : ''}
                        {pitComparison.second.avgTime && (
                          <> — avg {pitComparison.second.avgTime.toFixed(1)}s</>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Delta */}
                {pitComparison.winner.avgTime && pitComparison.second?.avgTime && (
                  <div className="text-caption-1 text-label-tertiary pt-1 border-t border-glass-border">
                    {(() => {
                      const d = pitComparison.winner.avgTime - pitComparison.second.avgTime
                      const faster = d < 0
                      return (
                        <span>
                          {winner.code} pit crew {faster ? 'faster' : 'slower'} by{' '}
                          <span className={`font-mono font-semibold ${faster ? 'text-emerald-600' : 'text-red-500'}`}>
                            {Math.abs(d).toFixed(2)}s
                          </span> avg
                        </span>
                      )
                    })()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fastest lap callout */}
      {fastest_lap && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/8">
          <span className="text-caption-2 uppercase tracking-wider text-purple-600">Fastest Lap</span>
          <span className="font-mono font-bold text-sm text-purple-700">{fastest_lap.time}</span>
          <span className="text-caption-1 text-purple-500">{fastest_lap.code} — Lap {fastest_lap.lap || '?'}</span>
        </div>
      )}
    </section>
  )
}
