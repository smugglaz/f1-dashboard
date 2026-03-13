import { formatLapTime, formatInterval } from '../utils/format'
import { getPositionColor, getTireColor } from '../utils/colors'
import MiniSectorBar from './MiniSectorBar'

export default function TimingTower({ timing = [] }) {
  if (!timing.length) {
    return <div className="text-label-tertiary text-center py-8">No timing data available</div>
  }

  const sorted = [...timing].sort((a, b) => (a.position || 99) - (b.position || 99))

  return (
    <div className="overflow-x-auto">
      {/* Sector color legend */}
      <div className="flex items-center gap-4 px-2 pb-2 text-[10px] text-label-tertiary">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#AB47BC' }} />Best</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#4CAF50' }} />PB</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#FDD835' }} />Slower</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-glass-border text-label-tertiary text-[10px] tracking-wider uppercase">
            <th className="py-2 px-2 text-left w-10">POS</th>
            <th className="py-2 px-2 text-left">DRIVER</th>
            <th className="py-2 px-2 text-right">GAP</th>
            <th className="py-2 px-2 text-right">INT</th>
            <th className="py-2 px-2 text-right">LAST LAP</th>
            <th className="py-2 px-2 text-center">SECTORS</th>
            <th className="py-2 px-2 text-center">TYRE</th>
            <th className="py-2 px-2 text-right">PIT</th>
            <th className="py-2 px-2 text-right">LAPS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((drv) => {
            const pos = drv.position || 99
            const posColor = getPositionColor(pos)
            const teamColor = drv.team_colour ? `#${drv.team_colour}` : drv.team_color || '#555'
            const compound = drv.tire_compound || drv.tyre_compound || ''
            const tireColor = getTireColor(compound)
            const tireAge = drv.tire_age ?? drv.tyre_age ?? ''
            const stintNum = drv.stint_number ?? ''
            const abbr = drv.abbreviation || drv.driver_number || '???'
            const lastName = drv.full_name ? drv.full_name.split(' ').slice(-1)[0] : ''

            return (
              <tr
                key={drv.driver_number || abbr}
                className="border-b border-glass-border/50 hover:bg-black/[0.04] transition-colors team-stripe"
                style={{ '--stripe-color': teamColor }}
              >
                <td className="py-1.5 px-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono"
                    style={posColor ? { color: posColor } : { color: pos <= 10 ? '#1A1A2E' : '#9CA3AF' }}>
                    {pos <= 98 ? pos : '-'}
                  </span>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs font-mono">{abbr}</span>
                    {lastName && <span className="text-label-tertiary text-xs hidden sm:inline">{lastName}</span>}
                  </div>
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-xs">
                  {pos === 1 ? <span className="text-label-tertiary text-[10px]">LEADER</span> : (drv.gap_to_leader ? formatInterval(drv.gap_to_leader) : '-')}
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-xs">
                  {pos === 1 ? '' : (drv.interval ? formatInterval(drv.interval) : '-')}
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-xs">
                  <span className={drv.is_personal_best ? 'text-f1-green' : drv.is_overall_best ? 'text-f1-purple' : ''}>
                    {drv.last_lap_time ? formatLapTime(drv.last_lap_time) : '-'}
                  </span>
                </td>
                <td className="py-1.5 px-2"><MiniSectorBar sectors={drv.sectors || []} /></td>
                <td className="py-1.5 px-2 text-center">
                  {compound ? (
                    <div className="flex items-center justify-center gap-1">
                      <span className="inline-block w-4 h-4 rounded-full text-[8px] font-bold leading-4 text-center"
                        style={{ backgroundColor: tireColor, color: compound.toUpperCase() === 'HARD' ? '#000' : '#fff' }}
                        title={`${compound}${tireAge !== '' ? ` — ${tireAge} laps` : ''}`}>
                        {compound[0]}
                      </span>
                      {tireAge !== '' && <span className="text-[10px] text-label-tertiary font-mono">{tireAge}</span>}
                    </div>
                  ) : '-'}
                </td>
                <td className="py-1.5 px-2 text-right text-xs font-mono text-label-tertiary">
                  {stintNum > 1 ? stintNum - 1 : stintNum === 1 ? '0' : '-'}
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-xs">{drv.lap_number ?? drv.laps ?? '-'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
