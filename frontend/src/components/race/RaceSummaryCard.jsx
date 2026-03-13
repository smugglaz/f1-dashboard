import { useApi } from '@/hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatRow } from '@/components/ui/stat-row'
import { getTeamColor, getTeamName } from '@/utils/teams'
import { Trophy, MapPin, Thermometer } from 'lucide-react'

export default function RaceSummaryCard({ year, round }) {
  const { data: summary, loading: loadingSummary } = useApi(
    year && round ? `/api/historical/race-summary/${year}/${round}` : null
  )
  const { data: circuitData, loading: loadingCircuit } = useApi(
    year && round ? `/api/historical/circuit-info/${year}/${round}` : null
  )

  const loading = loadingSummary || loadingCircuit

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Race Summary</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="flex gap-2"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-16" /></div>
        </CardContent>
      </Card>
    )
  }

  if (!summary?.winner) return null

  const { race, winner, margin, second, fastest_lap, safety_cars, virtual_safety_cars, red_flags, dnfs, total_pit_stops, weather } = summary
  const circuit = circuitData?.circuit
  const teamColor = getTeamColor(getTeamName(winner))

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: teamColor }} />
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-label-tertiary" />
            {race.name}
          </CardTitle>
          <span className="text-xs text-label-tertiary">
            {race.date ? new Date(race.date).toLocaleDateString() : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Winner info */}
          <div>
            <p className="text-[10px] text-label-tertiary uppercase tracking-wider mb-2">Winner</p>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: teamColor }} />
              <div>
                <div className="text-lg font-bold">{winner.name}</div>
                <div className="text-sm text-label-tertiary">{getTeamName(winner)} &middot; from P{winner.grid}</div>
              </div>
            </div>
            {second && (
              <p className="text-xs text-label-tertiary mt-2">
                Margin: <span className="font-mono font-semibold text-label-primary">{margin || second.time}</span> to {second.code}
              </p>
            )}
            {fastest_lap && (
              <p className="text-xs text-label-tertiary mt-1">
                FL: <span className="font-mono text-purple-400">{fastest_lap.time}</span> ({fastest_lap.code})
              </p>
            )}
          </div>

          {/* Race events */}
          <div>
            <p className="text-[10px] text-label-tertiary uppercase tracking-wider mb-2">Race Events</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {safety_cars > 0 && <Badge variant="warning">SC &times; {safety_cars}</Badge>}
              {virtual_safety_cars > 0 && <Badge variant="warning">VSC &times; {virtual_safety_cars}</Badge>}
              {red_flags > 0 && <Badge variant="destructive">Red Flag &times; {red_flags}</Badge>}
              {weather?.rain && <Badge variant="secondary">Wet</Badge>}
              {safety_cars === 0 && virtual_safety_cars === 0 && red_flags === 0 && (
                <Badge variant="success">Clean Race</Badge>
              )}
            </div>
            <StatRow label="DNFs" value={dnfs.length} />
            <StatRow label="Total Pit Stops" value={total_pit_stops} />
          </div>

          {/* Circuit + weather */}
          <div>
            <p className="text-[10px] text-label-tertiary uppercase tracking-wider mb-2">Circuit & Conditions</p>
            {circuit && (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-label-tertiary">
                  <MapPin className="h-3 w-3" />
                  {circuit.locality}, {circuit.country}
                </div>
                {circuit.track_length_km && (
                  <StatRow label="Length" value={`${circuit.track_length_km} km`} />
                )}
                {circuit.num_corners && (
                  <StatRow label="Corners" value={circuit.num_corners} />
                )}
              </div>
            )}
            {weather && (weather.avg_air_temp || weather.avg_track_temp) && (
              <div className="flex items-center gap-1.5 text-xs text-label-tertiary mt-2">
                <Thermometer className="h-3 w-3" />
                {weather.avg_air_temp && `Air ${weather.avg_air_temp}°C`}
                {weather.avg_air_temp && weather.avg_track_temp && ' / '}
                {weather.avg_track_temp && `Track ${weather.avg_track_temp}°C`}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
