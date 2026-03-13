import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from './card'

function DataCard({ title, icon: Icon, action, className, contentClassName, children }) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-label-tertiary" />}
          <CardTitle>{title}</CardTitle>
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}

export { DataCard }
