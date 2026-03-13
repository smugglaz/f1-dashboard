import { getTeamColor, getTeamName } from '@/utils/teams'
import { getPositionColor } from '@/utils/colors'

export default function StartingGrid({ qualifying }) {
  if (!qualifying?.length) return null

  // Take top 20 and sort by position
  const grid = [...qualifying]
    .sort((a, b) => (a.position || 99) - (b.position || 99))
    .slice(0, 20)

  // Group into rows of 2 (F1 grid formation)
  const rows = []
  for (let i = 0; i < grid.length; i += 2) {
    rows.push(grid.slice(i, i + 2))
  }

  return (
    <div className="space-y-1.5">
      {rows.map((pair, ri) => (
        <div key={ri} className="flex justify-center gap-3">
          {pair.map((driver, di) => {
            const teamColor = getTeamColor(getTeamName(driver))
            const pos = driver.position || (ri * 2 + di + 1)
            return (
              <div
                key={driver.code || di}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-black/[0.03] w-40 ${
                  di === 0 ? 'justify-end' : 'justify-start'
                }`}
              >
                {di === 0 && (
                  <>
                    <span className="text-caption-2 text-label-tertiary font-mono">{driver.q3 || driver.q2 || driver.q1 || ''}</span>
                    <span className="text-xs font-bold font-mono">{driver.code}</span>
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: teamColor }} />
                    <span className="text-caption-2 font-mono text-label-secondary w-5 text-center">{pos}</span>
                  </>
                )}
                {di === 1 && (
                  <>
                    <span className="text-caption-2 font-mono text-label-secondary w-5 text-center">{pos}</span>
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: teamColor }} />
                    <span className="text-xs font-bold font-mono">{driver.code}</span>
                    <span className="text-caption-2 text-label-tertiary font-mono">{driver.q3 || driver.q2 || driver.q1 || ''}</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
