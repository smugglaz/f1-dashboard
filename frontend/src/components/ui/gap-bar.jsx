import { cn } from '@/lib/utils'

function GapBar({ value, maxValue, color = 'var(--primary)', label, className }) {
  const percentage = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-2 rounded-full bg-f1-border/50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      {label && (
        <span className="text-xs text-f1-muted font-mono tabular-nums min-w-[3rem] text-right">
          {label}
        </span>
      )}
    </div>
  )
}

export { GapBar }
