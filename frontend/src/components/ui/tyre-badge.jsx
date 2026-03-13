import { cn } from '@/lib/utils'
import { getTireColor } from '@/utils/colors'

const COMPOUND_SHORT = {
  SOFT: 'S',
  MEDIUM: 'M',
  HARD: 'H',
  INTERMEDIATE: 'I',
  WET: 'W',
}

function TyreBadge({ compound, age, className }) {
  const color = getTireColor(compound)
  const short = COMPOUND_SHORT[compound?.toUpperCase()] || '?'

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {short}
      </span>
      {age !== undefined && (
        <span className="text-xs text-f1-muted font-mono">{age}L</span>
      )}
    </div>
  )
}

export { TyreBadge }
