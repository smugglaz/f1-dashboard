import { cn } from '@/lib/utils'

function StatRow({ label, value, badge, valueColor, className }) {
  return (
    <div className={cn('flex items-center justify-between py-1', className)}>
      <span className="text-xs text-label-tertiary uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-glass-border text-label-tertiary">
            {badge}
          </span>
        )}
        <span className={cn('text-sm font-semibold font-mono tabular-nums', valueColor)}>
          {value}
        </span>
      </div>
    </div>
  )
}

export { StatRow }
