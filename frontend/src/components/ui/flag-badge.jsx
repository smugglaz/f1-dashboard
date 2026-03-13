import { cn } from '@/lib/utils'

const FLAG_STYLES = {
  GREEN: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  YELLOW: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  RED: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  SC: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  VSC: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-400/30' },
  CHEQUERED: { bg: 'bg-black/[0.06]', text: 'text-white', border: 'border-white/20' },
  BLUE: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
}

function FlagBadge({ flag, label, className }) {
  const style = FLAG_STYLES[flag?.toUpperCase()] || FLAG_STYLES.GREEN
  const displayLabel = label || flag

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border',
        style.bg, style.text, style.border,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {displayLabel}
    </span>
  )
}

export { FlagBadge }
