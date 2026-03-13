import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { useWebSocket } from '../hooks/useWebSocket'
import TimingTower from '../components/TimingTower'
import WeatherWidget from '../components/WeatherWidget'
import RaceControlFeed from '../components/RaceControlFeed'
import LiveTrackMap from '../components/LiveTrackMap'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Flag, Cloud, Radio, Map, Timer } from 'lucide-react'

const SESSION_LABELS = {
  'Practice 1': 'FP1', 'Practice 2': 'FP2', 'Practice 3': 'FP3',
  'Qualifying': 'QUALI', 'Sprint Qualifying': 'SQ',
  'Sprint': 'SPRINT', 'Race': 'RACE',
}

export default function LiveTiming() {
  const { data: sessionInfo, loading: loadingSession, refetch: refetchSession } = useApi('/api/live/session')
  const { data: restTiming } = useApi('/api/live/timing')
  const { data: weather, refetch: refetchWeather } = useApi('/api/live/weather')
  const { data: raceControl, refetch: refetchRC } = useApi('/api/live/race-control')

  const [timing, setTiming] = useState([])

  const { data: wsData, status: wsStatus } = useWebSocket('/ws/live-timing')
  const wsConnected = wsStatus === 'connected'

  useEffect(() => {
    if (wsData?.timing) {
      setTiming(prev => {
        const map = new Map(prev.map(d => [d.driver_number, d]))
        for (const d of wsData.timing) {
          map.set(d.driver_number, { ...map.get(d.driver_number), ...d })
        }
        return Array.from(map.values())
      })
    }
  }, [wsData])

  useEffect(() => {
    const restArr = restTiming?.timing || (Array.isArray(restTiming) ? restTiming : [])
    if (restArr.length && !timing.length) setTiming(restArr)
  }, [restTiming])

  useEffect(() => {
    const id = setInterval(() => {
      refetchWeather()
      refetchRC()
    }, 15000)
    return () => clearInterval(id)
  }, [])

  const isActive = sessionInfo && sessionInfo.status !== 'no_active_session'

  if (loadingSession) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40 lg:col-span-2" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const rcMessages = raceControl?.messages || (Array.isArray(raceControl) ? raceControl : [])

  const positions = timing
    .filter(d => d.x != null && d.y != null)
    .map(d => ({
      driver_number: d.driver_number,
      abbreviation: d.abbreviation || d.name_acronym || '',
      team_colour: d.team_colour || d.team_color || '',
      x: d.x,
      y: d.y,
    }))

  const sessionLabel = sessionInfo?.session_name
    ? SESSION_LABELS[sessionInfo.session_name] || sessionInfo.session_name
    : ''

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Timing"
        subtitle={isActive ? `${sessionInfo.session_name} — ${sessionInfo.circuit} ${sessionInfo.country}` : undefined}
      >
        <div className="flex items-center gap-3">
          {isActive && sessionLabel && (
            <Badge variant="destructive" className="uppercase tracking-wider text-[10px]">
              {sessionLabel}
            </Badge>
          )}
          <div className={`flex items-center gap-1.5 text-xs ${wsConnected ? 'text-green-400' : 'text-f1-muted'}`}>
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse-dot' : 'bg-gray-500'}`} />
            {wsConnected ? 'LIVE' : wsStatus === 'reconnecting' ? 'RECONNECTING' : 'DISCONNECTED'}
          </div>
          <Button variant="outline" size="sm" onClick={refetchSession}>
            Refresh
          </Button>
        </div>
      </PageHeader>

      {!isActive ? (
        <EmptyState
          icon={Flag}
          title="No Active Session"
          description="Live timing will appear here during practice, qualifying, and race sessions."
          action="Check Again"
          onAction={refetchSession}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cloud className="h-3.5 w-3.5 text-f1-muted" />
                  Weather
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WeatherWidget weather={weather} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Radio className="h-3.5 w-3.5 text-f1-muted" />
                  Race Control
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RaceControlFeed messages={rcMessages} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            <Card className="xl:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Timer className="h-3.5 w-3.5 text-f1-muted" />
                  Timing Tower
                  {timing.length > 0 && (
                    <span className="text-[10px] text-f1-muted font-mono font-normal ml-auto">
                      {timing.length} drivers
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TimingTower timing={timing} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Map className="h-3.5 w-3.5 text-f1-muted" />
                  Track Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LiveTrackMap positions={positions} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
