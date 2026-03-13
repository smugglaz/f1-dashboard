import { getTeamColor } from '@/utils/teams'

/**
 * Auto-generates a narrative sentence about how the winner won.
 */
export default function WinnerInsight({ summary, stints, sectors }) {
  if (!summary?.winner) return null

  const { winner, second, margin, fastest_lap, safety_cars, weather } = summary
  const teamColor = getTeamColor(winner.constructor || '')

  // Build narrative fragments
  const fragments = []

  // Grid position story
  const grid = winner.grid || 0
  if (grid === 1) {
    fragments.push('led from pole')
  } else if (grid <= 3) {
    fragments.push(`moved up from P${grid}`)
  } else if (grid > 5) {
    fragments.push(`charged through from P${grid}`)
  }

  // Margin story
  if (margin) {
    if (margin.includes('lap')) {
      fragments.push(`winning by ${margin}`)
    } else {
      const secs = parseFloat(margin)
      if (!isNaN(secs)) {
        if (secs > 20) fragments.push('in a dominant display')
        else if (secs > 10) fragments.push('with a comfortable margin')
        else if (secs < 2) fragments.push('in a close fight')
      }
    }
  }

  // Weather
  if (weather?.rain) {
    fragments.push('in wet conditions')
  }

  // Safety cars
  if (safety_cars > 1) {
    fragments.push(`surviving ${safety_cars} safety car periods`)
  }

  // Fastest lap
  if (fastest_lap?.code === winner.code) {
    fragments.push('also taking the fastest lap')
  }

  const narrative = fragments.length
    ? `${winner.name} ${fragments.join(', ')}.`
    : `${winner.name} took the victory.`

  return (
    <div className="flex items-start gap-4">
      <div className="w-1.5 h-16 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
      <div>
        <div className="text-title-1 font-semibold">{winner.name}</div>
        <div className="text-footnote text-label-secondary mt-0.5">
          {winner.constructor} — {second ? `${margin || second.time} ahead of ${second.code}` : 'Race Winner'}
        </div>
        <p className="text-body text-label-secondary mt-2">
          {narrative}
        </p>
      </div>
    </div>
  )
}
