import { Link } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getTeamColor } from '@/utils/teams'
import { Flag, AlertTriangle, CloudRain, Zap, ArrowRight } from 'lucide-react'

export default function RecentRaceSummary({ year, round }) {
  const { data, loading } = useApi(
    year && round ? `/api/historical/race-summary/${year}/${round}` : null
  )

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Last Race</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardContent>
      </Card>
    )
  }

  if (!data?.winner) return null

  const { race, winner, margin, second, fastest_lap, safety_cars, virtual_safety_cars, red_flags, dnfs, total_pit_stops, weather } = data
  const teamColor = getTeamColor(winner.constructor || '')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-label-tertiary" />
            Last Race
          </CardTitle>
          <span className="text-caption-2">Round {race.round}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Winner */}
        <div>
          <p className="text-caption-1 mb-1">{race.name}</p>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: teamColor }} />
            <div>
              <div className="text-title-2">{winner.name}</div>
              <div className="text-footnote">
                {winner.constructor} &middot; from P{winner.grid}
              </div>
            </div>
          </div>
        </div>

        {/* Margin + fastest lap */}
        <div className="flex items-center gap-4 text-xs">
          {second && (
            <div>
              <span className="text-label-tertiary">Margin: </span>
              <span className="font-mono font-semibold">{margin || second.time}</span>
              <span className="text-label-tertiary"> to {second.code}</span>
            </div>
          )}
          {fastest_lap && (
            <div>
              <span className="text-label-tertiary">FL: </span>
              <span className="font-mono text-purple-600">{fastest_lap.time}</span>
              <span className="text-label-tertiary"> ({fastest_lap.code})</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {safety_cars > 0 && (
            <Badge variant="warning">SC &times; {safety_cars}</Badge>
          )}
          {virtual_safety_cars > 0 && (
            <Badge variant="warning">VSC &times; {virtual_safety_cars}</Badge>
          )}
          {red_flags > 0 && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Red Flag &times; {red_flags}
            </Badge>
          )}
          {weather?.rain && (
            <Badge variant="secondary">
              <CloudRain className="h-3 w-3 mr-1" />
              Wet
            </Badge>
          )}
          {dnfs.length > 0 && (
            <Badge variant="outline">{dnfs.length} DNF{dnfs.length > 1 ? 's' : ''}</Badge>
          )}
          {total_pit_stops > 0 && (
            <Badge variant="outline">
              <Zap className="h-3 w-3 mr-1" />
              {total_pit_stops} stops
            </Badge>
          )}
        </div>

        {/* Race Story CTA */}
        <Link
          to={`/race-story/${year}/${round}`}
          className="flex items-center gap-1.5 text-caption-1 text-label-tertiary hover:text-label-primary transition-colors group"
        >
          <span>View Race Story</span>
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </CardContent>
    </Card>
  )
}
