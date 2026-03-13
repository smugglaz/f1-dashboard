import { cn } from '@/lib/utils'
import { cva } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-label-primary/8 text-label-primary',
        secondary: 'border-transparent bg-black/[0.04] text-label-secondary',
        destructive: 'border-transparent bg-red-500/12 text-red-600',
        outline: 'border-glass-border text-label-primary',
        success: 'border-transparent bg-emerald-500/12 text-emerald-600',
        warning: 'border-transparent bg-amber-500/12 text-amber-600',
        glass: 'glass-subtle text-label-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
