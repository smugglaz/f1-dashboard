import { SECTOR_COLORS, getSectorLabel } from '../utils/colors'

export default function MiniSectorBar({ sectors = [] }) {
  if (!sectors.length) return <span className="text-label-tertiary text-xs">—</span>

  return (
    <div className="flex gap-0.5 justify-center">
      {sectors.map((code, i) => (
        <div
          key={i}
          className="w-3 h-4 rounded-sm cursor-default"
          style={{ backgroundColor: SECTOR_COLORS[code] || '#444' }}
          title={`S${i + 1}: ${getSectorLabel(code)}`}
        />
      ))}
    </div>
  )
}
