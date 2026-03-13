import { cn } from '@/lib/utils'

function PageHeader({ title, subtitle, children, className }) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        <h1 className="text-large-title">{title}</h1>
        {subtitle && (
          <p className="text-footnote mt-1">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  )
}

export { PageHeader }
