import { useMemo } from 'react'
import { useApi } from '@/hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { getTireColor, TIRE_COLORS } from '@/utils/colors'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CircleDot } from 'lucide-react'

function msToLapTime(ms) {
  if (!ms) return '-'
  const s = ms / 1000
  const mins = Math.floor(s / 60)
  const secs = (s % 60).toFixed(3)
  return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs
}

export default function TyreDegradation({ year, round }) {
  const { data, loading } = useApi(
    year && round ? `/api/historical/tyre-performance/${year}/${round}` : null
  )

  const chartData = useMemo(() => {
    if (!data?.compounds) return []

    // Build merged data by tyre_life
    const allLives = new Set()
    for (const [, points] of Object.entries(data.compounds)) {
      for (const p of points) allLives.add(p.tyre_life)
    }
    const sorted = Array.from(allLives).sort((a, b) => a - b)

    return sorted.map(life => {
      const row = { tyre_life: life }
      for (const [compound, points] of Object.entries(data.compounds)) {
        const point = points.find(p => p.tyre_life === life)
        if (point) {
          row[compound] = point.avg_lap_ms / 1000 // Convert to seconds for chart
        }
      }
      return row
    })
  }, [data])

  const compounds = data?.compounds ? Object.keys(data.compounds) : []

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Tyre Degradation</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    )
  }

  if (!compounds.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CircleDot className="h-4 w-4" />Tyre Degradation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-f1-muted text-center py-4">
            No tyre performance data available. Requires FastF1 data (2018+ races).
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-f1-muted" />
            Tyre Degradation
          </CardTitle>
          <div className="flex gap-1.5">
            {compounds.map(c => (
              <Badge key={c} variant="outline" className="text-[10px]" style={{ borderColor: getTireColor(c), color: getTireColor(c) }}>
                {c}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-f1-muted mb-3">
          Average lap time by tyre life (green flag, accurate laps only). {data.total_laps_analyzed} laps analyzed.
        </p>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" />
            <XAxis
              dataKey="tyre_life"
              label={{ value: 'Tyre Life (laps)', position: 'insideBottom', offset: -5, style: { fill: '#9CA3AF', fontSize: 11 } }}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={v => msToLapTime(v * 1000)}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              label={{ value: 'Lap Time', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF', fontSize: 11 } }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 12 }}
              labelFormatter={v => `Tyre Life: ${v} laps`}
              formatter={(v, name) => [msToLapTime(v * 1000), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {compounds.map(c => (
              <Line
                key={c}
                type="monotone"
                dataKey={c}
                stroke={getTireColor(c)}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
