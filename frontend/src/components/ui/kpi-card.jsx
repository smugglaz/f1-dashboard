import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function KpiCard({ title, value, delta, deltaLabel, trend, icon: Icon, accentColor, className, children }) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-f1-muted',
  }
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {accentColor && (
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accentColor }} />
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-f1-muted" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {(delta !== undefined || deltaLabel) && (
          <div className={cn('flex items-center gap-1 mt-1 text-xs', trendColors[trend] || trendColors.neutral)}>
            <TrendIcon className="h-3 w-3" />
            <span>{delta}</span>
            {deltaLabel && <span className="text-f1-muted">{deltaLabel}</span>}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  )
}

export { KpiCard }
