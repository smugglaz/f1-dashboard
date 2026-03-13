import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCountdown } from '@/utils/format'
import { Calendar, MapPin, Timer, Mountain } from 'lucide-react'

export default function UpcomingRace({ year, round }) {
  const { data, loading } = useApi(
    year && round ? `/api/historical/circuit-info/${year}/${round}` : null
  )

  const [countdown, setCountdown] = useState('')
  const raceDate = data?.race?.date

  useEffect(() => {
    if (!raceDate) return
    const update = () => setCountdown(formatCountdown(raceDate))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [raceDate])

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Next Race</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { race, circuit, schedule } = data

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-f1-red" />
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-f1-muted" />
            Next Race
          </CardTitle>
          <Badge variant="default">ROUND {race.round}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Race name + countdown */}
        <div>
          <div className="text-xl font-bold">{race.name}</div>
          <div className="text-f1-red font-mono text-2xl font-bold mt-1">{countdown}</div>
        </div>

        {/* Circuit info */}
        {circuit && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-f1-muted">
              <MapPin className="h-3 w-3" />
              {circuit.locality}, {circuit.country}
            </div>
            {circuit.track_length_km && (
              <div className="flex items-center gap-1.5 text-f1-muted">
                <Timer className="h-3 w-3" />
                {circuit.track_length_km} km &middot; {circuit.num_corners || '?'} turns
              </div>
            )}
            {circuit.altitude != null && (
              <div className="flex items-center gap-1.5 text-f1-muted">
                <Mountain className="h-3 w-3" />
                {circuit.altitude}m altitude
              </div>
            )}
          </div>
        )}

        {/* Sprint badge */}
        {race.has_sprint && (
          <Badge variant="warning">Sprint Weekend</Badge>
        )}

        {/* Schedule */}
        {schedule?.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-f1-muted uppercase tracking-wider">Schedule</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
              {schedule.map((s, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-f1-muted">{s.session}</span>
                  <span className="font-mono">
                    {s.date ? new Date(s.date + (s.time ? 'T' + s.time : '')).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
