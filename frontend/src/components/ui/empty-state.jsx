import { cn } from '@/lib/utils'
import { Button } from './button'

function EmptyState({ icon: Icon, title, description, action, onAction, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {Icon && (
        <div className="rounded-full bg-f1-border/30 p-4 mb-4">
          <Icon className="h-8 w-8 text-f1-muted" />
        </div>
      )}
      <h3 className="text-sm font-medium text-f1-text mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-f1-muted max-w-sm">{description}</p>
      )}
      {action && onAction && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  )
}

export { EmptyState }
