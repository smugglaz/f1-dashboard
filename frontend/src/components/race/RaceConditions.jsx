import { useApi } from '@/hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FlagBadge } from '@/components/ui/flag-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from 'recharts'
import { Cloud } from 'lucide-react'

export default function RaceConditions({ year, round, session = 'Race' }) {
  const { data: weatherData, loading: loadingWeather } = useApi(
    year && round ? `/api/historical/weather/${year}/${round}/${session}` : null
  )
  const { data: rcData, loading: loadingRC } = useApi(
    year && round ? `/api/historical/race-control/${year}/${round}/${session}` : null
  )

  const loading = loadingWeather || loadingRC

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Race Conditions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  const weatherSamples = weatherData?.samples || []
  const messages = rcData?.messages || []

  if (!weatherSamples.length && !messages.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Cloud className="h-4 w-4" />Conditions</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-f1-muted text-center py-4">
            No weather or race control data available. Requires FastF1 data (2018+ races).
          </p>
        </CardContent>
      </Card>
    )
  }

  // Format weather data for chart - convert seconds to minutes
  const chartData = weatherSamples.map(s => ({
    ...s,
    time_min: s.time_s != null ? Math.round(s.time_s / 60) : 0,
    rain_area: s.rainfall ? 100 : 0,
  }))

  // Key race control messages (flags, safety cars)
  const keyMessages = messages.filter(m =>
    m.flag || m.category === 'SafetyCar' || m.category === 'Flag'
  ).slice(0, 30) // Limit display

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-f1-muted" />
          Conditions — {session}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weather chart */}
        {chartData.length > 0 && (
          <div>
            <p className="text-[10px] text-f1-muted uppercase tracking-wider mb-2">Temperature & Rainfall</p>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" />
                <XAxis
                  dataKey="time_min"
                  label={{ value: 'Session Time (min)', position: 'insideBottom', offset: -5, style: { fill: '#9CA3AF', fontSize: 10 } }}
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 9 }}
                />
                <YAxis yAxisId="temp" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                <YAxis yAxisId="rain" orientation="right" hide />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 11 }}
                  labelFormatter={v => `${v} min`}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area yAxisId="rain" type="step" dataKey="rain_area" fill="#3b82f6" fillOpacity={0.15} stroke="none" name="Rain" />
                <Line yAxisId="temp" type="monotone" dataKey="air_temp" stroke="#f97316" strokeWidth={1.5} dot={false} name="Air Temp (°C)" />
                <Line yAxisId="temp" type="monotone" dataKey="track_temp" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Track Temp (°C)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Race control feed */}
        {keyMessages.length > 0 && (
          <div>
            <p className="text-[10px] text-f1-muted uppercase tracking-wider mb-2">Race Control Messages</p>
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {keyMessages.map((m, i) => {
                const mins = m.time_s != null ? Math.floor(m.time_s / 60) : null
                return (
                  <div key={i} className="flex items-start gap-2 py-1 border-b border-f1-border/10 last:border-0">
                    <span className="text-[10px] font-mono text-f1-muted w-12 shrink-0 text-right">
                      {mins != null ? `${mins}m` : ''}
                    </span>
                    {m.flag && <FlagBadge flag={m.flag} className="shrink-0" />}
                    <span className="text-xs text-f1-text flex-1">
                      {m.message}
                      {m.driver && <span className="text-f1-muted ml-1">({m.driver})</span>}
                    </span>
                    {m.lap && <span className="text-[10px] text-f1-muted">L{m.lap}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
