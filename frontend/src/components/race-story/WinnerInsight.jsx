import { useMemo } from 'react'
import { getTeamColor, getTeamName } from '@/utils/teams'

/**
 * Auto-generates a rich narrative about how the winner won.
 * Analyzes: grid position, margin, strategy (undercut/overcut), tyre management,
 * sector pace, pit execution, weather, safety cars.
 * Inspired by the F1 Technical Deep Dive "Interconnected Matrix" concept.
 */
export default function WinnerInsight({ summary, stints, sectors, pitStops, tyrePerf }) {
  if (!summary?.winner) return null

  const { winner, second, margin, fastest_lap, safety_cars, weather } = summary
  const teamColor = getTeamColor(getTeamName(winner))

  const analysis = useMemo(() => {
    const fragments = []
    const details = []

    // ── Grid position story ──
    const grid = winner.grid || 0
    if (grid === 1) {
      fragments.push('led from pole')
    } else if (grid === 2 || grid === 3) {
      fragments.push(`moved up from P${grid}`)
    } else if (grid > 3 && grid <= 10) {
      fragments.push(`climbed from P${grid} on the grid`)
    } else if (grid > 10) {
      fragments.push(`produced a remarkable recovery drive from P${grid}`)
    }

    // ── Margin story ──
    // Use second?.time (the gap to P2, e.g. "+2.974") instead of margin (winner's total race time)
    const gap = second?.time || margin
    if (gap) {
      if (typeof gap === 'string' && gap.includes('lap')) {
        fragments.push(`winning by ${gap}`)
        details.push({ label: 'Dominance', value: `Won by ${gap}`, color: '#34C759' })
      } else {
        const secs = parseFloat(String(gap).replace('+', ''))
        if (!isNaN(secs)) {
          if (secs > 25) {
            fragments.push('in a commanding display')
            details.push({ label: 'Margin', value: `${secs.toFixed(1)}s — dominant`, color: '#34C759' })
          } else if (secs > 10) {
            fragments.push('with a comfortable margin')
            details.push({ label: 'Margin', value: `${secs.toFixed(1)}s — controlled`, color: '#34C759' })
          } else if (secs < 2) {
            fragments.push('in a fight to the flag')
            details.push({ label: 'Margin', value: `${secs.toFixed(1)}s — razor thin`, color: '#FF9500' })
          } else {
            details.push({ label: 'Margin', value: `${secs.toFixed(1)}s`, color: '#86868b' })
          }
        }
      }
    }

    // ── Strategy analysis: undercut/overcut detection ──
    if (stints?.stints && second) {
      const winnerStints = stints.stints.filter(s => s.driver_code === winner.code)
      const secondStints = stints.stints.filter(s => s.driver_code === second.code)

      if (winnerStints.length > 0 && secondStints.length > 0) {
        const winnerStops = winnerStints.length - 1
        const secondStops = secondStints.length - 1

        if (winnerStops !== secondStops) {
          const stratWord = winnerStops < secondStops ? 'fewer-stop' : 'aggressive multi-stop'
          fragments.push(`using a ${stratWord} strategy`)
          details.push({
            label: 'Strategy',
            value: `${winnerStops}-stop vs ${second.code}'s ${secondStops}-stop`,
            color: '#007AFF'
          })
        }

        // Detect undercut/overcut via first pit stop lap comparison
        if (winnerStints.length >= 2 && secondStints.length >= 2) {
          const winnerFirstPitLap = winnerStints[0]?.lap_end || winnerStints[0]?.stint_end
          const secondFirstPitLap = secondStints[0]?.lap_end || secondStints[0]?.stint_end

          if (winnerFirstPitLap && secondFirstPitLap) {
            const pitDelta = winnerFirstPitLap - secondFirstPitLap
            if (pitDelta < -1) {
              details.push({
                label: 'Undercut',
                value: `Pitted ${Math.abs(pitDelta)} laps before ${second.code}`,
                color: '#FF9500'
              })
            } else if (pitDelta > 1) {
              details.push({
                label: 'Overcut',
                value: `Stayed out ${pitDelta} laps longer than ${second.code}`,
                color: '#FF9500'
              })
            }
          }
        }

        // Tyre compound story
        const compounds = winnerStints.map(s => s.compound).filter(Boolean)
        if (compounds.length > 0) {
          details.push({
            label: 'Tyres',
            value: compounds.join(' \u2192 '),
            color: '#86868b'
          })
        }
      }
    }

    // ── Sector pace dominance ──
    if (sectors?.drivers?.length && second) {
      const winnerSectors = sectors.drivers.find(d => d.code === winner.code)
      const secondSectors = sectors.drivers.find(d => d.code === second.code)

      if (winnerSectors && secondSectors) {
        const sectorWins = []
        if ((winnerSectors.best_s1_ms || Infinity) < (secondSectors.best_s1_ms || Infinity)) sectorWins.push('S1')
        if ((winnerSectors.best_s2_ms || Infinity) < (secondSectors.best_s2_ms || Infinity)) sectorWins.push('S2')
        if ((winnerSectors.best_s3_ms || Infinity) < (secondSectors.best_s3_ms || Infinity)) sectorWins.push('S3')

        if (sectorWins.length === 3) {
          fragments.push('with pace advantage in every sector')
          details.push({ label: 'Pace', value: 'Fastest in all 3 sectors vs P2', color: '#34C759' })
        } else if (sectorWins.length >= 2) {
          details.push({ label: 'Pace', value: `Faster in ${sectorWins.join(' & ')} vs ${second.code}`, color: '#34C759' })
        } else if (sectorWins.length === 1) {
          details.push({ label: 'Pace Edge', value: `Stronger in ${sectorWins[0]} vs ${second.code}`, color: '#007AFF' })
        }
      }
    }

    // ── Pit crew execution ──
    const allStops = pitStops?.pit_stops || pitStops?.stops || []
    if (allStops.length > 0) {
      const driverCode = (p) => p.driver_code || p.driver?.code || ''
      const winnerPits = allStops.filter(p => driverCode(p) === winner.code)
      if (winnerPits.length > 0) {
        const durations = winnerPits.map(p => parseFloat(p.duration)).filter(d => !isNaN(d) && d > 0)
        const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
        if (avg > 0) {
          details.push({
            label: 'Pit Crew',
            value: `${avg.toFixed(1)}s avg (${winnerPits.length} stop${winnerPits.length !== 1 ? 's' : ''})`,
            color: avg < 25 ? '#34C759' : '#86868b'
          })
        }
      }
    }

    // ── Weather ──
    if (weather?.rain) {
      fragments.push('in wet conditions')
      details.push({ label: 'Conditions', value: 'Wet race', color: '#007AFF' })
    }

    // ── Safety cars ──
    if (safety_cars > 1) {
      fragments.push(`surviving ${safety_cars} safety car periods`)
      details.push({ label: 'Disruptions', value: `${safety_cars} safety cars`, color: '#FF9500' })
    } else if (safety_cars === 1) {
      details.push({ label: 'SC', value: '1 safety car', color: '#FF9500' })
    }

    // ── Fastest lap ──
    if (fastest_lap?.code === winner.code) {
      if (grid === 1) {
        fragments.push('completing a grand slam')
      } else {
        fragments.push('also claiming fastest lap')
      }
    }

    const narrative = fragments.length
      ? `${winner.name} ${fragments.join(', ')}.`
      : `${winner.name} took the victory.`

    return { narrative, details }
  }, [summary, stints, sectors, pitStops, tyrePerf, winner, second, margin, fastest_lap, safety_cars, weather])

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-1.5 h-16 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
        <div>
          <div className="text-title-1 font-semibold">{winner.name}</div>
          <div className="text-footnote text-label-secondary mt-0.5">
            {getTeamName(winner)} — {second?.time ? `${second.time} ahead of ${second.code}` : 'Race Winner'}
          </div>
          <p className="text-body text-label-secondary mt-2">
            {analysis.narrative}
          </p>
        </div>
      </div>

      {/* Detail chips — the interconnected factors that won the race */}
      {analysis.details.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-5">
          {analysis.details.map((d, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/[0.03] text-xs"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-label-tertiary font-medium">{d.label}:</span>
              <span className="text-label-primary">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
